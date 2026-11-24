# Warung Rush

**Night Market Kitchen Sprint** — a fast-paced Malaysian *warung* / *pasar malam* cooking and time-management game built with TypeScript, HTML5 Canvas, and Web Audio.

### Play Now
**[https://dansallehh.github.io/warungrush/](https://dansallehh.github.io/warungrush/)**

*(Mobile-first portrait layout with touch & mouse support. Installable as a PWA — on iOS Safari, tap **Share → Add to Home Screen** for fullscreen play.)*

---

## Game Summary

Step behind the hot griddle (*kuali*) of a bustling Malaysian night market stall and keep hungry customers fed before their patience runs out.

- **75-Second Shifts**: Each shift gives you 75 seconds to reach your cash target (starting at **RM 45** in Shift 1 and increasing by **+RM 25** each shift).
- **Escalating Menu & Pace**: Master **Roti Canai** and **Teh Tarik** in Shift 1, then unlock the multi-step **Burger Ramly** from Shift 2 onwards as customers arrive faster and grow more impatient.
- **Tactile Gestures**: Swipe to stretch dough, chop veggies, and flip food on the kuali; hold-and-release to pull frothy Teh Tarik; drag and tap to assemble and serve.
- **Combo & Tip System**: Serve customers while they still have more than half their patience left to trigger **Layan!** combos (up to **x5**) and earn extra tips.
- **Zero External Assets**: Procedural 2D Canvas visuals and synthesized Web Audio sound effects in a lightweight web app.

---

## Game Manual

### Kitchen Layout

| Zone | Location | Purpose |
| --- | --- | --- |
| **Top HUD** | Top bar | Shows current Shift, Cash / Target (RM), Timer, Combo, **Mute**, and **Fullscreen** controls |
| **Customer Rail** | Upper screen (3 slots) | Displays waiting customers, their requested dishes, and patience bars |
| **Teh Tarik Station** | Left | Hold-to-pull dispenser for brewing Teh Tarik |
| **Kuali (Griddle)** | Center (2 slots: `KUALI 1`, `KUALI 2`) | Cooks Roti, Patties, Eggs, and holds Wrapped Burgers |
| **Serving Plate** | Below Kuali | Holds one finished food dish (`Roti Canai` or `Burger Ramly`) ready to serve |
| **Prep Board** | Right | Used to stretch Roti dough and chop vegetables |
| **Ingredient & Tool Dock** | Bottom | `DOUGH`, `PATTY`, `EGG`, `VEG`, `SAUCE`, `WRAP`, and `TRASH` |

---

### Menu & Recipes

#### 1. Teh Tarik — **RM 3** *(Available from Shift 1)*
1. Press and **hold** the **Teh Tarik** dispenser to start pulling tea.
2. **Release** when the gauge is inside the **target zone (75%–90%)** to finish (`Tarik!`).
   - Releasing below 75% resets the cup.
   - Holding past 90% overflows the cup (`Tumpah!`) and locks the dispenser for 1 second.
3. **Serve** the ready cup to a customer.

#### 2. Roti Canai — **RM 4** *(Available from Shift 1)*
1. Tap **DOUGH** in the dock to place dough on the **Prep Board**.
2. **Swipe left or right twice** across the Prep Board to stretch it (`Tap to Toss!`).
3. **Tap** the Prep Board to toss the dough onto an open **Kuali** slot.
4. Once Side 1 is ready to flip (≥ 45%), **swipe up** on the Kuali slot to flip it (`Flip!`).
5. When Side 2 finishes cooking (`TAP TO PLATE`), **tap** the Kuali slot to move it to the **Serving Plate**.
6. **Serve** from the Serving Plate.

#### 3. Burger Ramly — **RM 8** *(Unlocks in Shift 2)*
1. **Chop Veg** *(can be stocked ahead of time)*: Tap **VEG** to place veggies on the **Prep Board**, then **swipe down 3 times** to chop — adds **+3** to your sliced veg stock (shown on the `VEG` button).
2. **Grill Patty**: Tap **PATTY** to drop a patty onto an open **Kuali** slot. When ready (≥ 45%), **swipe up** to flip and cook Side 2 until done.
3. **Fry Egg**: Tap **EGG** to drop an egg onto the other **Kuali** slot *(no flip required)*.
4. **Wrap**: **Drag** the cooked **Patty** onto the **Egg** slot to combine them into a **Wrapped Burger** (`Wrapped!`).
5. **Dress**: Tap **VEG** (uses 1 sliced veg stock) to add garnish (`+Veg`), and tap **SAUCE** to add sauce (`+Sauce`).
6. **Plate & Serve**: Tap **WRAP** in the dock (or drag the dressed burger onto **WRAP**) to place it on the **Serving Plate**, then serve!

---

### Serving, Combos & Customers

- **Quick Serve**: Tap a ready dish on the **Serving Plate** or the **Teh Tarik** station to automatically serve the most urgent matching customer.
- **Targeted Serve**: Drag a ready dish directly onto a customer, or tap the customer while holding a matching dish on the plate / Teh Tarik station.
- **Layan! Combos & Tips**:
  - Serving a dish while a customer's patience is **above 50%** increases your combo (up to **x5**) and adds a **+RM (combo - 1)** bonus.
  - Completing a customer's entire order above 50% patience awards their **tip**.
  - Serving below 50% patience or letting a customer walk away (`Lama sangat!`) resets your combo to **x1**.

#### Customer Archetypes

| Customer | Look | Base Patience | Order Size | Tip (when served > 50% patience) |
| --- | --- | --- | --- | --- |
| **Pak Cik** | Songkok & moustache | 42s | 1–2 items | RM 2 |
| **Office Rush** | Glasses | 25s | 1–2 items | RM 4 |
| **Lepak** | Orange cap | 50s | 2–3 items | RM 3 |

*(Patience scales down slightly on higher shifts.)*

---

### Avoiding Burns & Using Trash

- Food left on the **Kuali** too long after finishing will burn (`HANGUS!`).
- **Clear burnt items** by:
  - **Double-tapping** the burnt Kuali slot, or
  - **Tapping** `TRASH` in the dock, or
  - **Dragging** the burnt item onto `TRASH`.
- You can also drag unwanted items from the Serving Plate, Teh Tarik station, or Kuali onto `TRASH` to discard them.

---

### Tips for High Shifts

- **Pre-chop veggies** during quiet moments so you always have `VEG` stock ready for Burger Ramly orders.
- **Prioritize Office Rush** customers — they have the shortest patience bar but pay the highest tip (**RM 4**).
- **Keep both Kuali slots busy**: cook a Patty and Egg in parallel, or grill a Roti while pulling Teh Tarik.
- Switching tabs or backgrounding the app automatically **pauses** your shift.

---

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```