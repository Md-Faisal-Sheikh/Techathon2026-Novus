#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

const int FAN_1_POT_PIN = 34; 
const int FAN_2_PIN = 26;
const int LIGHT_1_PIN = 27;
const int LIGHT_2_PIN = 14;
const int LIGHT_3_PIN = 13;

void setup() {
  Serial.begin(115200);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  
  pinMode(FAN_2_PIN, INPUT_PULLUP);
  pinMode(LIGHT_1_PIN, INPUT_PULLUP);
  pinMode(LIGHT_2_PIN, INPUT_PULLUP);
  pinMode(LIGHT_3_PIN, INPUT_PULLUP);
}

void loop() {
  int potValue = analogRead(FAN_1_POT_PIN);
  int fan1Watts = map(potValue, 0, 4095, 0, 60);
  bool fan1Status = (fan1Watts > 0); 

  bool fan2 = !digitalRead(FAN_2_PIN);
  bool light1 = !digitalRead(LIGHT_1_PIN);
  bool light2 = !digitalRead(LIGHT_2_PIN);
  bool light3 = !digitalRead(LIGHT_3_PIN);

  int totalOn = fan1Status + fan2 + light1 + light2 + light3;

  display.clearDisplay();
  
  // 1. Inverted Header with Mock Network Status
  display.fillRect(0, 0, 128, 14, WHITE);
  display.setTextColor(BLACK, WHITE); // Black text on White background
  display.setTextSize(1);
  display.setCursor(2, 3);
  display.print(" WORK ROOM 1");
  // Mock WiFi Icon (using basic text/shapes)
  display.setCursor(105, 3);
  display.print("[W]"); 

  // 2. Main Status Layout
  display.setTextColor(WHITE);
  display.setTextSize(2);
  
  // Active Count
  display.setCursor(5, 22);
  display.print(totalOn); 
  display.setTextSize(1);
  display.print(" ON");
  
  // Dynamic Warnings
  display.setCursor(65, 22);
  if (totalOn == 5) {
    display.print("WARNING:");
    display.setCursor(65, 32);
    display.print("ALL ACTIVE");
  } else if (totalOn == 0) {
    display.print("STANDBY");
  } else {
    display.print("NORMAL");
  }

  // 3. Dynamic Power Bar for Fan 1
  display.setCursor(0, 43);
  display.print("Fan 1 Power: ");
  display.print(fan1Watts);
  display.print("W");
  
  // Draw the outer rectangle for the bar
  display.drawRect(0, 53, 128, 10, WHITE);
  // Map the wattage to the pixel width of the bar (max 124 pixels)
  int barWidth = map(fan1Watts, 0, 60, 0, 124);
  // Fill the inner rectangle based on power
  display.fillRect(2, 55, barWidth, 6, WHITE);

  display.display();

  // JSON Payload Generation
  String json = "[";
  json += "{\"id\":\"work_room_1_fan_1\",\"status\":" + String(fan1Status ? "true" : "false") + ",\"powerDraw\":" + String(fan1Watts) + "},";
  json += "{\"id\":\"work_room_1_fan_2\",\"status\":" + String(fan2 ? "true" : "false") + "},";
  json += "{\"id\":\"work_room_1_light_1\",\"status\":" + String(light1 ? "true" : "false") + "},";
  json += "{\"id\":\"work_room_1_light_2\",\"status\":" + String(light2 ? "true" : "false") + "},";
  json += "{\"id\":\"work_room_1_light_3\",\"status\":" + String(light3 ? "true" : "false") + "}";
  json += "]";

  Serial.println(json);
  delay(1000); 
}