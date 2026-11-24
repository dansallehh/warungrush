# Warung Rush v2.0

**Tropical Warung Kitchen Sprint** — a fast-paced 2.5D Malaysian *warung* cooking and time-management game inspired by *Cooking Crush*, built with TypeScript, HTML5 Canvas, and Web Audio.

### Play Now
**[https://dansallehh.github.io/warungrush/](https://dansallehh.github.io/warungrush/)**

*(Built for a wide 16:9 landscape counter with touch & mouse support. Installable as a PWA — on mobile, rotate to landscape or add to Home Screen for fullscreen play.)*

---

## What's New in v2.0

- **2.5D Tropical Beachside Warung & Glossy UI**: Bright coastal backdrop with swaying palms, wooden boardwalk, stainless-steel perspective counter with chrome side rails, cast-iron pans, ceramic blue-rimmed plates, expressive 2.5D customers, and glossy 3D-beveled buttons & HUD.
- **Kitchen Upgrade Shop**: Earn persistent **RM** coins every shift (kept even if you miss the target!) and invest in **6 multi-level upgrades** saved in `localStorage`:
  - **Kuali Griddle** (2 → 3 → 4 pans + faster cooking)
  - **Teh Tarik Urn** (1 → 2 → 3 ready cups + faster pull & wider sweet spot)
  - **Serving Plates** (2 → 3 → 4 ceramic plates)
  - **Prep Board** (fewer swipes to stretch/chop + bigger veggie stock yield)
  - **Premium Spices** (+RM 1 / +RM 3 base price on every dish)
  - **Warung Lights** (+15% / +30% customer patience + bigger tips + festive counter lights)
- **New Dish & Customer**: **Roti Telur** unlocks in Shift 3, and **Kakak Foodie** joins the 4-slot customer rail alongside **Pak Cik**, **Office Rush**, and **Lepak**.
- **Flying Dishes, 3-Star Shift Ratings & LAYAN FEVER**: Dishes arc to customers on serve; reach **x4+ combo** to ignite **LAYAN FEVER** for **2x tips**!

---

## Game Manual

### Kitchen Layout (Landscape Counter)

| Zone | Location | Purpose |
| --- | --- | --- |
| **Top HUD** | Top bar | Shift & Combo badge, golden Cash / Target progress bar with 3-Star milestones, Timer, **Fullscreen**, **Mute**, and **Pause** buttons |
| **Customer Rail** | Upper counter (4 slots) | Expressive customers with glossy order bubbles and vertical patience bars |
| **Teh Tarik Station** | Left | Upper urn to **hold-and-pull** tea; lower drip tray holds 1–3 ready cups |
| **Kuali Griddle** | Center-Left (2–4 pans) | Cast-iron pans for Roti, Patties, Eggs, and Wrapped Burgers |
| **Serving Plates** | Center-Right (2–4 plates) | Ceramic plates holding finished food ready to serve |
| **Prep Board** | Far-Right | Butcher-block board for stretching Roti dough and chopping veggies |
| **Ingredient & Tool Dock** | Bottom | `DOUGH`, `PATTY`, `EGG`, `VEG`, `SAUCE`, `WRAP`, and `TRASH` |

---

### Menu & Recipes (Gesture Controls)

#### 1. Teh Tarik — **RM 4+** *(Shift 1+)*
1. Press and **hold** the upper **Teh Tarik Urn** to pour.
2. **Release** inside the **green target zone** to add a frothy cup to the ready tray (`Tarik!`).
   - Holding past the target zone overflows (`Tumpah!`).
3. **Tap** the ready tray (or **drag** a cup to a customer) to serve.

#### 2. Roti Canai — **RM 5+** *(Shift 1+)*
1. Tap **DOUGH** to place dough on the **Prep Board**.
2. **Swipe left/right** across the Prep Board to stretch it (`Tap to Toss!`).
3. **Tap** the Prep Board to toss it onto an open **Kuali** pan.
4. Once Side 1 is ready (`SWIPE ▲ FLIP`), **swipe up** on the pan to flip it.
5. When cooked (`TAP TO PLATE`), **tap** the pan to move it to a **Serving Plate**, then serve!

#### 3. Burger Ramly — **RM 10+** *(Unlocks Shift 2)*
1. **Chop Veg**: Tap **VEG** to place veggies on the **Prep Board**, then **swipe down** to chop and build sliced veggie stock (`VEG (3)`).
2. **Grill Patty**: Tap **PATTY** to drop onto a Kuali pan; **swipe up** when ready to flip and finish cooking.
3. **Fry Egg**: Tap **EGG** on another open pan *(no flip needed)*.
4. **Wrap**: **Drag** the cooked **Patty** onto the **Egg** pan (`Wrapped!`).
5. **Dress**: Tap **VEG** (adds garnish) and tap **SAUCE** (adds chili/mayo drizzle).
6. **Plate**: Tap **WRAP** (or drag the dressed burger onto **WRAP** / the plates) to plate and serve!

#### 4. Roti Telur — **RM 7+** *(Unlocks Shift 3)*
1. Cook a **Roti Canai** and move it to a **Serving Plate**.
2. Fry an **EGG** on the Kuali until `READY`.
3. **Drag** the cooked Egg onto the plated Roti Canai — or simply **tap** the cooked Egg — to combine them into **Roti Telur**!

---

### Serving, Combos & Tips

- **Quick Serve**: Tap any plated dish or the Teh Tarik ready tray to automatically fly it to the most urgent matching customer.
- **Targeted Serve**: Drag a dish onto a specific customer, or tap the customer directly.
- **Layan! Combos & Fever**: Serving a customer with **> 50% patience** builds your combo up to **x5** (`+RM (combo - 1)` bonus per dish) and awards their tip on order completion. Reaching **x4+** triggers **LAYAN FEVER (2x Tips)**!
- **Burnt Food (`HANGUS!`)**: Clear burnt pans by **double-tapping** the pan, tapping **TRASH**, or dragging the burnt item to **TRASH**.

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