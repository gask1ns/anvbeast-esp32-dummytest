#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <arduinoFFT.h>
#include "secrets.h"

namespace {

constexpr char WIFI_SSID[] = "ANVBEASTZ";
constexpr char WIFI_PASSWORD[] = "anaknakal";
constexpr char SUPABASE_TABLE[] = "vibration_fft_logs";

constexpr char DEVICE_ID[] = "esp32-dummy-fft-01";

constexpr uint16_t SAMPLE_COUNT = 256;
constexpr double SAMPLING_FREQUENCY = 1024.0;
constexpr uint32_t SAMPLE_INTERVAL_US = static_cast<uint32_t>(1000000.0 / SAMPLING_FREQUENCY);
constexpr uint32_t UPLOAD_INTERVAL_MS = 1000;
constexpr double MOTOR_RPM_JITTER_PERCENT = 0.03;
constexpr uint16_t MOTOR_RPM_MIN_JITTER = 20;

enum class DemoScenario {
  Normal,
  Unbalance,
  Misalignment,
  BearingFault,
};

struct AnalysisResult {
  double motorRpm = 0.0;
  double runningFrequencyHz = 0.0;
  double overallRms = 0.0;
  double dominantFrequencyHz = 0.0;
  double peakMagnitude = 0.0;
  double fundamentalEnergyRatio = 0.0;
  double secondHarmonicEnergyRatio = 0.0;
  double highFrequencyEnergyRatio = 0.0;
  String healthState;
  int healthScore = 0;
  String faultType;
};

enum class FaultTargetMode {
  Auto,
  Normal,
  Unbalance,
  Misalignment,
  BearingFault,
};

enum class MotorRpmMode {
  Auto,
  Fixed,
};

float vReal[SAMPLE_COUNT];
float vImag[SAMPLE_COUNT];

unsigned long lastUploadMs = 0;
uint32_t uploadCounter = 0;
FaultTargetMode targetMode = FaultTargetMode::Auto;
MotorRpmMode motorRpmMode = MotorRpmMode::Auto;
uint16_t fixedMotorRpm = 1500;
bool processingEnabled = false;
String serialCommandBuffer;

constexpr uint16_t ALLOWED_MOTOR_RPMS[] = {1500, 2000, 3000, 3500};

const char *targetModeName(FaultTargetMode mode) {
  switch (mode) {
    case FaultTargetMode::Auto:
      return "auto";
    case FaultTargetMode::Normal:
      return "normal";
    case FaultTargetMode::Unbalance:
      return "unbalance";
    case FaultTargetMode::Misalignment:
      return "misalignment";
    case FaultTargetMode::BearingFault:
      return "bearing_fault";
  }

  return "auto";
}

const char *scenarioName(DemoScenario scenario) {
  switch (scenario) {
    case DemoScenario::Normal:
      return "normal";
    case DemoScenario::Unbalance:
      return "unbalance";
    case DemoScenario::Misalignment:
      return "misalignment";
    case DemoScenario::BearingFault:
      return "bearing_fault";
  }

  return "normal";
}

DemoScenario scenarioFromTargetMode(FaultTargetMode mode) {
  switch (mode) {
    case FaultTargetMode::Normal:
      return DemoScenario::Normal;
    case FaultTargetMode::Unbalance:
      return DemoScenario::Unbalance;
    case FaultTargetMode::Misalignment:
      return DemoScenario::Misalignment;
    case FaultTargetMode::BearingFault:
      return DemoScenario::BearingFault;
    case FaultTargetMode::Auto:
      break;
  }

  switch (uploadCounter % 4) {
    case 0:
      return DemoScenario::Normal;
    case 1:
      return DemoScenario::Unbalance;
    case 2:
      return DemoScenario::Misalignment;
    default:
      return DemoScenario::BearingFault;
  }
}

bool parseFaultTargetMode(const String &value, FaultTargetMode &mode) {
  if (value == "auto") {
    mode = FaultTargetMode::Auto;
    return true;
  }
  if (value == "normal") {
    mode = FaultTargetMode::Normal;
    return true;
  }
  if (value == "unbalance") {
    mode = FaultTargetMode::Unbalance;
    return true;
  }
  if (value == "misalignment") {
    mode = FaultTargetMode::Misalignment;
    return true;
  }
  if (value == "bearing" || value == "bearing_fault") {
    mode = FaultTargetMode::BearingFault;
    return true;
  }

  return false;
}

void printHelp() {
  Serial.println("Commands:");
  Serial.println("  help                  -> show commands");
  Serial.println("  status                -> show current target hint");
  Serial.println("  start                 -> start processing and upload");
  Serial.println("  stop                  -> stop processing and upload");
  Serial.println("  fault auto            -> clear the target hint");
  Serial.println("  fault normal          -> set target hint to normal");
  Serial.println("  fault unbalance       -> set target hint to unbalance");
  Serial.println("  fault misalignment    -> set target hint to misalignment");
  Serial.println("  fault bearing         -> set target hint to bearing fault");
  Serial.println("  motor auto            -> cycle motor RPM: 1500/2000/3000/3500");
  Serial.println("  motor 1500|2000|3000|3500 -> set fixed motor RPM");
}

void printStatus() {
  Serial.printf("Processing: %s\n", processingEnabled ? "running" : "standby");
  Serial.printf("Target mode: %s\n", targetModeName(targetMode));
  if (motorRpmMode == MotorRpmMode::Auto) {
    Serial.println("Motor RPM mode: auto (1500/2000/3000/3500)");
  } else {
    Serial.printf("Motor RPM mode: fixed (%u)\n", fixedMotorRpm);
  }
}

bool isAllowedMotorRpm(uint16_t rpm) {
  for (uint16_t allowedRpm : ALLOWED_MOTOR_RPMS) {
    if (rpm == allowedRpm) {
      return true;
    }
  }

  return false;
}

uint16_t autoMotorRpm() {
  return ALLOWED_MOTOR_RPMS[uploadCounter % 4];
}

uint16_t selectedMotorRpm() {
  if (motorRpmMode == MotorRpmMode::Fixed) {
    return fixedMotorRpm;
  }

  return autoMotorRpm();
}

void handleMotorCommand(const String &argument) {
  if (argument == "auto") {
    motorRpmMode = MotorRpmMode::Auto;
    Serial.println("Motor RPM mode set to auto");
    return;
  }

  const int parsedRpm = argument.toInt();
  if (parsedRpm <= 0 || !isAllowedMotorRpm(static_cast<uint16_t>(parsedRpm))) {
    Serial.println("Invalid motor RPM. Use: auto, 1500, 2000, 3000, or 3500");
    return;
  }

  fixedMotorRpm = static_cast<uint16_t>(parsedRpm);
  motorRpmMode = MotorRpmMode::Fixed;
  Serial.printf("Motor RPM fixed to: %u\n", fixedMotorRpm);
}

void handleFaultCommand(const String &argument) {
  FaultTargetMode parsedMode = FaultTargetMode::Auto;
  if (!parseFaultTargetMode(argument, parsedMode)) {
    Serial.println("Unknown fault target. Use: auto, normal, unbalance, misalignment, bearing");
    return;
  }

  targetMode = parsedMode;
  Serial.printf("Fault target set to: %s\n", targetModeName(targetMode));
}

void handleSerialCommand(String command) {
  command.trim();
  command.toLowerCase();

  if (command.length() == 0) {
    return;
  }

  if (command == "help") {
    printHelp();
    return;
  }

  if (command == "status") {
    printStatus();
    return;
  }

  if (command == "start") {
    if (processingEnabled) {
      Serial.println("Processing already running");
      return;
    }

    processingEnabled = true;
    lastUploadMs = millis() - UPLOAD_INTERVAL_MS;
    Serial.println("Processing started");
    return;
  }

  if (command == "stop") {
    processingEnabled = false;
    Serial.println("Processing stopped");
    return;
  }

  if (command.startsWith("fault ")) {
    handleFaultCommand(command.substring(6));
    return;
  }

  if (command.startsWith("scenario ")) {
    handleFaultCommand(command.substring(9));
    return;
  }

  if (command.startsWith("motor ")) {
    handleMotorCommand(command.substring(6));
    return;
  }

  if (command.startsWith("rpm ")) {
    handleMotorCommand(command.substring(4));
    return;
  }

  if (command == "auto") {
    targetMode = FaultTargetMode::Auto;
    printStatus();
    return;
  }

  Serial.println("Unknown command. Type 'help'.");
}

void pollSerialCommands() {
  while (Serial.available() > 0) {
    const char incoming = static_cast<char>(Serial.read());
    if (incoming == '\r') {
      continue;
    }

    if (incoming == '\n') {
      handleSerialCommand(serialCommandBuffer);
      serialCommandBuffer = "";
      continue;
    }

    if (serialCommandBuffer.length() < 80) {
      serialCommandBuffer += incoming;
    }
  }
}

int scoreForIso10816ClassI(double overallRms) {
  if (overallRms < 0.71) {
    return 100;
  }
  if (overallRms < 1.8) {
    return 80;
  }
  if (overallRms < 4.5) {
    return 45;
  }
  return 10;
}

String healthStateForIso10816ClassI(double overallRms) {
  if (overallRms < 0.71) {
    return "good";
  }
  if (overallRms < 1.8) {
    return "satisfactory";
  }
  if (overallRms < 4.5) {
    return "unsatisfactory";
  }
  return "unacceptable";
}

double generateDummyMotorRpm(DemoScenario scenario) {
  (void)scenario;
  const uint16_t baseRpm = selectedMotorRpm();
  const int jitterSpan = max(static_cast<int>(MOTOR_RPM_MIN_JITTER), static_cast<int>(round(baseRpm * MOTOR_RPM_JITTER_PERCENT)));
  const int deltaRpm = random(-jitterSpan, jitterSpan + 1);
  return static_cast<double>(baseRpm + deltaRpm);
}

double scenarioFundamentalAmplitude(DemoScenario scenario) {
  switch (scenario) {
    case DemoScenario::Normal:
      return 0.32;
    case DemoScenario::Unbalance:
      return 1.35;
    case DemoScenario::Misalignment:
      return 0.78;
    case DemoScenario::BearingFault:
      return 0.55;
  }

  return 0.32;
}

float generateDummyVibrationSample(uint16_t index, DemoScenario scenario, double motorRpm) {
  const double runningFrequencyHz = motorRpm / 60.0;
  const double timeSeconds = static_cast<double>(index) / SAMPLING_FREQUENCY;

  const double phaseOne = 2.0 * PI * runningFrequencyHz * timeSeconds;
  const double phaseTwo = 2.0 * PI * (2.0 * runningFrequencyHz) * timeSeconds;
  const double phaseThree = 2.0 * PI * (3.0 * runningFrequencyHz) * timeSeconds;

  float signal = 0.0f;

  switch (scenario) {
    case DemoScenario::Normal:
      signal = static_cast<float>(scenarioFundamentalAmplitude(scenario) * sin(phaseOne)
        + 0.08 * sin(phaseTwo)
        + 0.03 * sin(phaseThree));
      break;
    case DemoScenario::Unbalance:
      signal = static_cast<float>(scenarioFundamentalAmplitude(scenario) * sin(phaseOne)
        + 0.12 * sin(phaseTwo + 0.2)
        + 0.05 * sin(phaseThree + 0.4));
      break;
    case DemoScenario::Misalignment:
      signal = static_cast<float>(0.65 * sin(phaseOne)
        + 1.05 * sin(phaseTwo + 0.3)
        + 0.55 * sin(phaseThree + 0.7));
      break;
    case DemoScenario::BearingFault:
      signal = static_cast<float>(0.42 * sin(phaseOne)
        + 0.28 * sin(phaseTwo)
        + 0.16 * sin(phaseThree)
        + 0.78 * sin(2.0 * PI * 176.0 * timeSeconds)
        + 0.62 * sin(2.0 * PI * 228.0 * timeSeconds + 0.5)
        + 0.18 * sin(2.0 * PI * 256.0 * timeSeconds + 1.0));
      break;
  }

  const float noise = static_cast<float>(0.05 * (static_cast<double>(random(-1000, 1000)) / 1000.0));
  return signal + noise;
}

void captureDummySamples(DemoScenario scenario, double motorRpm) {
  unsigned long nextSampleAt = micros();

  for (uint16_t index = 0; index < SAMPLE_COUNT; ++index) {
    vReal[index] = generateDummyVibrationSample(index, scenario, motorRpm);
    vImag[index] = 0.0f;

    nextSampleAt += SAMPLE_INTERVAL_US;
    while (static_cast<long>(micros() - nextSampleAt) < 0) {
      delayMicroseconds(2);
      pollSerialCommands();
    }
  }

  float mean = 0.0f;
  for (uint16_t index = 0; index < SAMPLE_COUNT; ++index) {
    mean += vReal[index];
  }
  mean /= SAMPLE_COUNT;

  for (uint16_t index = 0; index < SAMPLE_COUNT; ++index) {
    vReal[index] -= mean;
  }
}

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.printf("Connecting to WiFi %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');

    if (millis() - startedAt > 20000) {
      Serial.println();
      Serial.println("WiFi connection timeout");
      return;
    }
  }

  Serial.println();
  Serial.print("WiFi connected, IP: ");
  Serial.println(WiFi.localIP());
}

void analyzeVibration(AnalysisResult &result) {
  float energy = 0.0f;
  for (uint16_t index = 0; index < SAMPLE_COUNT; ++index) {
    energy += vReal[index] * vReal[index];
  }
  result.overallRms = sqrt(energy / SAMPLE_COUNT);

  ArduinoFFT<float> FFT(vReal, vImag, SAMPLE_COUNT, SAMPLING_FREQUENCY);
  FFT.dcRemoval();
  FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward);
  FFT.compute(FFTDirection::Forward);
  FFT.complexToMagnitude();

  result.dominantFrequencyHz = FFT.majorPeak();

  result.peakMagnitude = 0.0;
  float totalEnergy = 0.0f;
  float firstBandEnergy = 0.0f;
  float secondBandEnergy = 0.0f;
  float highBandEnergy = 0.0f;

  const float fundamentalHz = static_cast<float>(result.runningFrequencyHz);
  const float firstBandMinHz = fundamentalHz - 4.0f;
  const float firstBandMaxHz = fundamentalHz + 4.0f;
  const float secondBandMinHz = (2.0f * fundamentalHz) - 6.0f;
  const float secondBandMaxHz = (2.0f * fundamentalHz) + 6.0f;

  const float binWidthHz = static_cast<float>(SAMPLING_FREQUENCY / SAMPLE_COUNT);
  const uint16_t firstStartBin = static_cast<uint16_t>(max(1.0f, floor(firstBandMinHz / binWidthHz)));
  const uint16_t firstEndBin = static_cast<uint16_t>(min(static_cast<float>(SAMPLE_COUNT / 2 - 1), ceil(firstBandMaxHz / binWidthHz)));
  const uint16_t secondStartBin = static_cast<uint16_t>(max(1.0f, floor(secondBandMinHz / binWidthHz)));
  const uint16_t secondEndBin = static_cast<uint16_t>(min(static_cast<float>(SAMPLE_COUNT / 2 - 1), ceil(secondBandMaxHz / binWidthHz)));
  const uint16_t highStartBin = static_cast<uint16_t>(max(1.0f, floor(120.0f / binWidthHz)));
  const uint16_t highEndBin = static_cast<uint16_t>(min(static_cast<float>(SAMPLE_COUNT / 2 - 1), ceil(250.0f / binWidthHz)));

  for (uint16_t index = 1; index < SAMPLE_COUNT / 2; ++index) {
    const float magnitude = vReal[index];
    const float magnitudeEnergy = magnitude * magnitude;

    totalEnergy += magnitudeEnergy;
    if (magnitude > result.peakMagnitude) {
      result.peakMagnitude = magnitude;
    }

    if (index >= firstStartBin && index <= firstEndBin) {
      firstBandEnergy += magnitudeEnergy;
    }
    if (index >= secondStartBin && index <= secondEndBin) {
      secondBandEnergy += magnitudeEnergy;
    }
    if (index >= highStartBin && index <= highEndBin) {
      highBandEnergy += magnitudeEnergy;
    }
  }

  totalEnergy = max(totalEnergy, 0.000001f);
  result.fundamentalEnergyRatio = firstBandEnergy / totalEnergy;
  result.secondHarmonicEnergyRatio = secondBandEnergy / totalEnergy;
  result.highFrequencyEnergyRatio = highBandEnergy / totalEnergy;

  const int isoScore = scoreForIso10816ClassI(result.overallRms);
  const String isoState = healthStateForIso10816ClassI(result.overallRms);

  String fault = "normal";
  int faultPenalty = 0;

  if (result.highFrequencyEnergyRatio > 0.28) {
    fault = "bearing_fault";
    faultPenalty = 25;
  } else if (result.secondHarmonicEnergyRatio > 0.22 && result.secondHarmonicEnergyRatio > (result.fundamentalEnergyRatio * 0.65)) {
    fault = "misalignment";
    faultPenalty = 15;
  } else if (result.fundamentalEnergyRatio > 0.30 && result.secondHarmonicEnergyRatio < 0.18) {
    fault = "unbalance";
    faultPenalty = 10;
  }

  result.faultType = fault;
  result.healthState = isoState;
  result.healthScore = constrain(isoScore - faultPenalty, 0, 100);
}

bool uploadToSupabase(const AnalysisResult &result) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  const String endpoint = String(SUPABASE_URL) + "/rest/v1/" + SUPABASE_TABLE;

  if (!http.begin(client, endpoint)) {
    Serial.println("Failed to initialize HTTP client");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<768> document;
  document["device_id"] = DEVICE_ID;
  document["sample_count"] = SAMPLE_COUNT;
  document["sampling_frequency_hz"] = SAMPLING_FREQUENCY;
  document["motor_rpm"] = result.motorRpm;
  document["running_frequency_hz"] = result.runningFrequencyHz;
  document["overall_vibration_rms_mm_s"] = result.overallRms;
  document["dominant_frequency_hz"] = result.dominantFrequencyHz;
  document["rms_value"] = result.overallRms;
  document["peak_magnitude"] = result.peakMagnitude;
  document["health_state"] = result.healthState;
  document["health_score"] = result.healthScore;
  document["fault_type"] = result.faultType;
  document["fundamental_energy_ratio"] = result.fundamentalEnergyRatio;
  document["second_harmonic_energy_ratio"] = result.secondHarmonicEnergyRatio;
  document["high_frequency_energy_ratio"] = result.highFrequencyEnergyRatio;
  document["iso_standard"] = "ISO 10816";
  document["iso_class"] = "Class I";
  document["signal_type"] = "dummy_mpu6500_fft";
  document["created_at_ms"] = millis();

  JsonObject payload = document.createNestedObject("payload");
  payload["sensor_source"] = "dummy";
  payload["fault_target_hint"] = targetModeName(targetMode);
  payload["notes"] = "dummy vibration data for FFT and health testing";
  payload["rpm_estimate"] = result.motorRpm;
  payload["health_state"] = result.healthState;
  payload["fault_type"] = result.faultType;

  String body;
  serializeJson(document, body);

  const int statusCode = http.POST(body);
  Serial.printf("Supabase response code: %d\n", statusCode);
  if (statusCode >= 200 && statusCode < 300) {
    http.end();
    return true;
  }

  const String response = http.getString();
  if (response.length() > 0) {
    Serial.println(response);
  }

  http.end();
  return false;
}

void runMeasurementCycle() {
  AnalysisResult result;
  const DemoScenario scenario = scenarioFromTargetMode(targetMode);
  result.motorRpm = generateDummyMotorRpm(scenario);
  result.runningFrequencyHz = result.motorRpm / 60.0;

  captureDummySamples(scenario, result.motorRpm);

  analyzeVibration(result);

  Serial.println("--- Vibration Result ---");
  Serial.printf("Target hint: %s\n", targetModeName(targetMode));
  Serial.printf("Motor RPM mode: %s\n", motorRpmMode == MotorRpmMode::Auto ? "auto" : "fixed");
  Serial.printf("Scenario: %s\n", scenarioName(scenario));
  Serial.printf("Motor RPM: %.1f rpm\n", result.motorRpm);
  Serial.printf("Running frequency: %.2f Hz\n", result.runningFrequencyHz);
  Serial.printf("Dominant frequency: %.2f Hz\n", result.dominantFrequencyHz);
  Serial.printf("Overall RMS: %.4f mm/s\n", result.overallRms);
  Serial.printf("Health state: %s\n", result.healthState.c_str());
  Serial.printf("Health score: %d\n", result.healthScore);
  Serial.printf("Fault type: %s\n", result.faultType.c_str());
  Serial.printf("Fundamental ratio: %.3f\n", result.fundamentalEnergyRatio);
  Serial.printf("Second harmonic ratio: %.3f\n", result.secondHarmonicEnergyRatio);
  Serial.printf("High frequency ratio: %.3f\n", result.highFrequencyEnergyRatio);
  Serial.printf("Peak magnitude: %.4f\n", result.peakMagnitude);

  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  if (WiFi.status() == WL_CONNECTED) {
    const bool uploaded = uploadToSupabase(result);
    Serial.println(uploaded ? "Upload success" : "Upload failed");
  }

  if (targetMode == FaultTargetMode::Auto) {
    ++uploadCounter;
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(1000);

  printHelp();
  printStatus();
  randomSeed(esp_random());
  connectToWiFi();
  Serial.println("System standby. Configure first, then type 'start'.");
}

void loop() {
  pollSerialCommands();

  if (processingEnabled && millis() - lastUploadMs >= UPLOAD_INTERVAL_MS) {
    lastUploadMs = millis();
    runMeasurementCycle();
  }

  delay(50);
}