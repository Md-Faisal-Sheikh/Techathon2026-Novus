# Hardware / Electrical Concept — One Room

This is a **simulation/concept only**. No hardware is needed to run the software
demo; the backend generates simulated data. This folder documents how the same
data *would* be produced in the real world, per the brief.

It covers a representative circuit for **one room** (Work Room 1: 2 fans + 3
lights). The other two rooms replicate the identical block, one ESP32 per room
(or one ESP32 with a port expander).

Files:
- `room1-schematic.svg` — the circuit diagram
- `room_firmware.ino` — ESP32 sketch (reads states, measures current, POSTs JSON)

> Build it yourself in Wokwi or Tinkercad from the pin map and connection list
> below. Wokwi is recommended for the ESP32 + Wi-Fi flow.

---

## What we sense

The brief asks for **on/off state** per device (required) and **current draw**
(optional). We do both:

1. **On/off per device** — an opto-isolated AC line detector on each device
   branch. When the branch is energized, the optocoupler conducts and pulls the
   ESP32 input to a known level. This gives a clean digital ON/OFF **without any
   electrical connection between mains and the microcontroller**.
2. **Total current** — a single ACS712 hall-effect sensor in series with the
   room's live feed measures aggregate current, from which power (W) and energy
   (Wh) are derived on the backend.

Per-device wattage in the demo is a fixed rating (fan = 60 W, light = 15 W). In
hardware you can either keep fixed ratings or move to a per-branch current sensor
if you need true per-device power.

---

## Pin-mapping table (ESP32)

| ESP32 pin | Direction | Connected to | Purpose |
|-----------|-----------|--------------|---------|
| GPIO32 | input (pull-up) | Fan 1 opto output | Fan 1 ON/OFF |
| GPIO33 | input (pull-up) | Fan 2 opto output | Fan 2 ON/OFF |
| GPIO25 | input (pull-up) | Light 1 opto output | Light 1 ON/OFF |
| GPIO26 | input (pull-up) | Light 2 opto output | Light 2 ON/OFF |
| GPIO27 | input (pull-up) | Light 3 opto output | Light 3 ON/OFF |
| GPIO35 | analog in (ADC1) | ACS712 OUT via divider | Total room current |
| 3V3 | power | Opto pull-up rail | Logic-side supply |
| GND | power | Common ground | Reference |

Notes:
- GPIO35 is **input-only and on ADC1** — correct choice, because ADC2 is unusable
  while Wi-Fi is active on the ESP32.
- The five sense pins use the ESP32 internal pull-ups (`INPUT_PULLUP`), so the
  opto transistor only has to pull the line **low** when the device is ON.

---

## Connection list (one room)

**Mains side (isolated, treat with care):**
- Room live (L) → through ACS712 IP+ / IP− (sensor sits in series with L).
- Each device (Fan 1, Fan 2, Light 1–3) tapped **across its own branch** with an
  H11AA1 AC-input optocoupler + series resistor (≈ 33 kΩ, 1 W) limiting current
  through the opto LED. H11AA1 handles AC directly (anti-parallel LEDs).

**Logic side (3.3 V, safe):**
- Each opto transistor: collector → its ESP32 GPIO (32/33/25/26/27), emitter → GND.
- ACS712 VCC → 5 V, GND → GND, OUT → resistor divider (e.g. 10 kΩ / 20 kΩ) →
  GPIO35. The divider scales the ACS712's 0–5 V swing into the ESP32's 0–3.3 V
  ADC range.
- ESP32 powered from USB / 5 V; shares GND with the ACS712.

---

## Electrical reasoning

- **Isolation first.** The opto-isolators and the ACS712 both give galvanic
  isolation, so a fault on the mains side can't reach the ESP32. This is the
  single most important safety property of the design.
- **Sense, don't switch.** This build only *reads* state — it does not control
  the loads, so there are no relays in the sensing path and nothing the firmware
  can do to energize a circuit. That keeps the concept low-risk.
- **ADC headroom.** ACS712 centres at VCC/2 (≈ 2.5 V) and swings with current.
  The divider keeps the peak within the ESP32 ADC's 3.3 V ceiling; in firmware we
  subtract the measured zero-current offset before scaling to amps.
- **One current sensor per room** is enough for the room-level power meter the
  dashboard shows. Per-device power in the demo uses nameplate ratings, which is
  standard practice for coarse energy dashboards.

---

## How it feeds the software

The firmware builds a small JSON payload and `POST`s it to the backend
(`/api/ingest` in a hardware build). In this hackathon demo the **simulator plays
the role of the firmware**, writing the same shape of data into the shared store —
so the dashboard and Discord bot are identical whether the source is real or
simulated. That swap-ability is the point: nothing downstream changes.
