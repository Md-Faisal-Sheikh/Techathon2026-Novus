/*
 * room_firmware.ino — ESP32, one room (Work Room 1)
 *
 * CONCEPT sketch matching hardware/README.md and room1-schematic.svg.
 * Reads 5 opto-isolated ON/OFF senses + 1 ACS712 current sensor, then POSTs a
 * JSON snapshot to the backend. In the hackathon demo the software simulator
 * plays this role instead, writing the same data shape into the shared store.
 *
 * Build it yourself in Wokwi (ESP32 + Wi-Fi). Libraries: WiFi, HTTPClient
 * (both bundled with the ESP32 Arduino core). No external JSON lib needed —
 * we hand-format a tiny payload.
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ---- config ----------------------------------------------------------------
const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASS = "your-password";
const char* INGEST_URL = "http://192.168.1.50:3000/api/ingest"; // backend host

const char* ROOM_KEY = "work1";

// Device sense pins (see pin-mapping table). LOW = device ON (opto pulls down).
struct Device { const char* name; const char* type; uint8_t pin; };
Device devices[] = {
  { "Fan 1",   "fan",   32 },
  { "Fan 2",   "fan",   33 },
  { "Light 1", "light", 25 },
  { "Light 2", "light", 26 },
  { "Light 3", "light", 27 },
};
const int DEVICE_COUNT = sizeof(devices) / sizeof(devices[0]);

const uint8_t ACS_PIN = 35;        // ADC1, input-only
const float ADC_REF = 3.3f;        // ESP32 ADC full-scale (after divider)
const float DIVIDER_GAIN = 3.0f;   // (10k+20k)/10k -> recover the 0-5V node
const float ACS_SENS = 0.100f;     // ACS712-20A: 100 mV per amp
float acsZero = 2.5f;              // measured zero-current midpoint (calibrated)

const unsigned long POST_EVERY_MS = 3000;
unsigned long lastPost = 0;

// ---- setup -----------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  for (int i = 0; i < DEVICE_COUNT; i++) pinMode(devices[i].pin, INPUT_PULLUP);
  analogReadResolution(12); // 0..4095

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Wi-Fi connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.printf("\nconnected: %s\n", WiFi.localIP().toString().c_str());

  calibrateZero();
}

// Average a quiet reading to find the ACS712 zero-current offset.
void calibrateZero() {
  long sum = 0;
  const int N = 200;
  for (int i = 0; i < N; i++) { sum += analogRead(ACS_PIN); delay(2); }
  float v = (sum / (float)N) / 4095.0f * ADC_REF * DIVIDER_GAIN;
  acsZero = v;
  Serial.printf("ACS712 zero offset = %.3f V\n", acsZero);
}

// ---- loop ------------------------------------------------------------------
void loop() {
  if (millis() - lastPost < POST_EVERY_MS) return;
  lastPost = millis();

  float amps = readCurrentAmps();
  String json = buildJson(amps);
  Serial.println(json);
  postJson(json);
}

bool deviceOn(const Device& d) {
  // Opto pulls the pull-up'd input LOW when the branch is energized.
  return digitalRead(d.pin) == LOW;
}

float readCurrentAmps() {
  // RMS-ish estimate: sample the divider node, convert back to the ACS node,
  // subtract the zero offset, divide by sensitivity.
  const int N = 400;
  double acc = 0;
  for (int i = 0; i < N; i++) {
    float v = analogRead(ACS_PIN) / 4095.0f * ADC_REF * DIVIDER_GAIN;
    float d = v - acsZero;
    acc += d * d;
    delayMicroseconds(200);
  }
  float vrms = sqrt(acc / N);
  float amps = vrms / ACS_SENS;
  return amps < 0.05f ? 0.0f : amps; // deadband
}

String buildJson(float amps) {
  String s = "{\"room\":\"";
  s += ROOM_KEY;
  s += "\",\"currentAmps\":";
  s += String(amps, 2);
  s += ",\"devices\":[";
  for (int i = 0; i < DEVICE_COUNT; i++) {
    if (i) s += ",";
    s += "{\"name\":\"";
    s += devices[i].name;
    s += "\",\"type\":\"";
    s += devices[i].type;
    s += "\",\"on\":";
    s += deviceOn(devices[i]) ? "true" : "false";
    s += "}";
  }
  s += "]}";
  return s;
}

void postJson(const String& json) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(json);
  Serial.printf("POST -> %d\n", code);
  http.end();
}
