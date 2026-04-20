# fivem-parking

A vehicle garage system for FiveM, allowing players to store and retrieve owned vehicles from any location.

[![](https://img.shields.io/badge/License-MIT-blue?logo=opensource)](./LICENSE)
[![](https://img.shields.io/github/contributors/bd53/fivem-parking?logo=github)](https://github.com/bd53/fivem-parking/graphs/contributors)
[![](https://img.shields.io/github/last-commit/bd53/fivem-parking?logo=github)](https://github.com/bd53/fivem-parking/commits/main)

## Building

Requires [pnpm](https://pnpm.io/).

```bash
pnpm build
```

Use `pnpm watch` to rebuild whenever a file is modified.

## Setup

This resource won't work without [oxmysql](https://github.com/overextended/oxmysql).

1. Download or clone the repository with `git clone https://github.com/bd53/fivem-parking`.
2. Copy `fivem-parking` folder into the `resources/` directory.
3. Add `ensure fivem-parking` to where resources are being loaded (after oxmysql resource).

## Usage

### Commands

#### Player

- `/list` _(alias: `/vg`)_ – Lists owned vehicles and their status:
  - Spawn – available when the vehicle is `stored`.
  - Return from Impound – available when the vehicle is `impound`.
  - Currently Outside – shown when the vehicle is already in the world; no action available.
- `/park` _(alias: `/vp`)_ – Store a vehicle in your vehicle garage.

#### Admin

- `/addveh [model] [playerId]` – Adds a vehicle to the database and the target player's garage.
- `/deleteveh [plate]` _(alias: `/delveh`)_ – Removes a vehicle from the database and the owner's garage.
- `/admincar [model]` _(alias: `/acar`)_ – Spawns a vehicle, saves it to the database, and sets it as owned.
- `/alist [playerId]` _(alias: `/avg`)_ – Lists a target player's owned vehicles.

### Exports

#### Server

- `impoundVehicle(plate: string): Promise<boolean>` - Sets a vehicle to the `impound` state by plate.

```lua
local success = exports['fivem-parking']:impoundVehicle(plate)
```

- `getVehicleByPlate(plate: string): Promise<Vehicle | null>` - Returns the full vehicle record for a given plate.

```lua
local vehicle = exports['fivem-parking']:getVehicleByPlate(plate)
```

- `getPlayerVehicles(license: string): Promise<Vehicle[]>` - Returns all vehicles owned by the given license identifier.

```lua
local vehicles = exports['fivem-parking']:getPlayerVehicles(license)
```

- `setVehicleStatus(plate: string, status: string): Promise<boolean>` - Sets the status of a vehicle by plate, `stored`, `outside`, or `impound`.

```lua
local success = exports['fivem-parking']:setVehicleStatus(plate, 'stored')
```

- `isVehicleOutside(plate: string): Promise<boolean>` - Returns `true` if the vehicle is currently spawned in the world.

```lua
local outside = exports['fivem-parking']:isVehicleOutside(plate)
```

## Credits

- [BerkieB](https://github.com/BerkieBb) originally made this resource. I wanted it publicly available, so here it is.

## License

A complete copy of the license is included in the [fivem-parking/LICENSE](./LICENSE) file.
