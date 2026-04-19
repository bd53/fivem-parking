# fivem-parking

A realistic vehicle garage system for FiveM, allowing players to store and retrieve owned vehicles from any location.

[![](https://img.shields.io/badge/License-MIT-blue?logo=opensource)](./LICENSE)
[![](https://img.shields.io/github/contributors/bd53/fivem-parking?logo=github)](https://github.com/bd53/fivem-parking/graphs/contributors)
[![](https://img.shields.io/github/last-commit/bd53/fivem-parking?logo=github)](https://github.com/bd53/fivem-parking/commits/main)

## Features

- Utilises [Prisma](https://www.prisma.io) to interact with your database.
- Menu is handled via Svelte, which has replaced the old ox_lib [interface](https://overextended.dev/ox_lib/Modules/Interface/Client/context) module.
- Supports logging via Discord.
- Administrators have the ability to manage and oversee vehicles via command.

## Installation

### Dependencies

- None required for core functionality.

### Build

1. Download the LTS version of [Node.js](https://nodejs.org/en).
2. Open a command-line terminal (e.g., Terminal, Command Prompt).
3. Enter `node --version` to verify the installation.
4. Run `npm install -g pnpm` to globally install the package manager [pnpm](https://pnpm.io).
5. Download or clone the repository with `git clone https://github.com/bd53/fivem-parking`.
6. Install all dependencies with `pnpm i`.
7. Create a new file named `.env` within the root directory.
8. Copy the contents of `.env.example` to the newly created `.env` file and edit accordingly.
9. Generate the Prisma client with `pnpm connect`.
10. Build the resource with `pnpm build`.

Use `pnpm watch` to rebuild whenever a file is modified.

## Usage

### Commands

#### Player

- `/list` _(alias: `/vg`)_ – Lists owned vehicles and their status:
  - Spawn – available when the vehicle is `stored`.
  - Return from Impound – available when the vehicle is `impound`; requires player to be at impound location.
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
