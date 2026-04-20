import * as Cfx from "@nativewrappers/fivem";
import { Config, getArea, getPlayerDisplayName, getPlayerLicense, isValidModelName, isValidPlate, sendChatMessage, sendLog } from "../utils";
import db, { Database } from "../db";

const PLATE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export class Garage {
        private spawnedEntities = new Map<number, number>();

        constructor(private db: Database) {
                on("entityRemoved", async (entity: number) => {
                        const vehicleId = this.spawnedEntities.get(entity);
                        if (vehicleId === undefined) return;
                        this.spawnedEntities.delete(entity);
                        await this.db.setVehicleStatus(vehicleId, "stored");
                });
        }

        private async generateUniquePlate(): Promise<string> {
                for (let i = 0; i < 10; i++) {
                        const plate = Array.from({ length: 8 }, () => PLATE_CHARS[Math.floor(Math.random() * PLATE_CHARS.length)]).join("");
                        if (!(await this.db.plateExists(plate))) return plate;
                }
                const base = Array.from({ length: 6 }, () => PLATE_CHARS[Math.floor(Math.random() * PLATE_CHARS.length)]).join("");
                return (base + Date.now().toString(36).slice(-2)).toUpperCase().slice(0, 8);
        }

        public async listVehicles(source: number) {
                const license = getPlayerLicense(source);
                if (!license) return [];

                const vehicles = await this.db.getOwnedVehicles(license);
                if (!vehicles || vehicles.length === 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou do not own any vehicles!");
                        return [];
                }

                emitNet("fivem-parking:client:listVehicles", source, vehicles);
                return vehicles;
        }

        public async parkVehicle(source: number): Promise<boolean> {
                const license = getPlayerLicense(source);
                if (!license) return false;

                const ped = GetPlayerPed(source);
                if (ped === 0) return false;

                const entity = GetVehiclePedIsIn(ped, false);
                if (entity === 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not inside of a vehicle!");
                        return false;
                }

                if (GetPedInVehicleSeat(entity, -1) !== ped) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou must be the driver to park!");
                        return false;
                }

                const plate = GetVehicleNumberPlateText(entity).trim();
                if (!isValidPlate(plate)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffThis vehicle has an invalid plate number.");
                        return false;
                }

                const vehicle = await this.db.getVehicleByPlate(plate);
                if (!vehicle) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffThis vehicle is not registered in the system.");
                        return false;
                }

                if (vehicle.owner !== license) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not the owner of this vehicle!");
                        return false;
                }

                if (vehicle.stored !== "outside") {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffThis vehicle cannot be parked.");
                        return false;
                }

                // Add your inventory check here before deducting (Config.Garage.StoreCost is the amount).
                // Example: if (exports.ox_inventory.GetItemCount(source, 'money') < Config.Garage.StoreCost) { ... }

                // Add your money deduction here.
                // Example: exports.ox_inventory.RemoveItem(source, 'money', Config.Garage.StoreCost)

                const parked = await this.db.setVehicleStatusAtomic(vehicle.id, "stored", "outside");
                if (!parked) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffThis vehicle cannot be parked.");
                        return false;
                }

                this.spawnedEntities.delete(entity);
                DeleteEntity(entity);

                sendChatMessage(source, "^#5e81ac[INFO] ^#ffffffSuccessfully parked vehicle.");
                const coords = GetEntityCoords(ped, true);
                await sendLog(`[VEHICLE] ${getPlayerDisplayName(source)} (${source}) parked vehicle #${vehicle.id} (${vehicle.model}) [${vehicle.plate}] at ${coords[0].toFixed(2)} ${coords[1].toFixed(2)} ${coords[2].toFixed(2)}.`);

                return true;
        }

        public async spawnVehicle(source: number, args: { vehicleId: number }): Promise<boolean> {
                const license = getPlayerLicense(source);
                if (!license) return false;

                const { vehicleId } = args;
                if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffInvalid vehicle ID.");
                        return false;
                }

                const vehicle = await this.db.getVehicle(vehicleId);
                if (!vehicle) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffSomething went wrong.");
                        return false;
                }

                if (vehicle.owner !== license) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not the owner of this vehicle!");
                        return false;
                }

                if (vehicle.stored !== "stored") {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffVehicle is not in storage!");
                        return false;
                }

                // Add your inventory check here before deducting (Config.Garage.RetrieveCost is the amount).
                // Add your money deduction here.

                const ped = GetPlayerPed(source);
                if (ped === 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffCould not find your character.");
                        return false;
                }

                const reserved = await this.db.setVehicleStatusAtomic(vehicleId, "outside", "stored");
                if (!reserved) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffVehicle is not in storage!");
                        return false;
                }

                const coords = GetEntityCoords(ped, true);
                const heading = GetEntityHeading(ped);
                const rad = (heading * Math.PI) / 180;
                const spawnX = coords[0] + Math.sin(-rad) * 5;
                const spawnY = coords[1] + Math.cos(-rad) * 5;

                const entity = CreateVehicleServerSetter(GetHashKey(vehicle.model), "automobile", spawnX, spawnY, coords[2] + 1, heading);
                if (!entity) {
                        await this.db.setVehicleStatus(vehicleId, "stored");
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                SetVehicleNumberPlateText(entity, vehicle.plate);

                let waited = 0;
                while (!DoesEntityExist(entity) && waited < 3000) {
                        await Cfx.Delay(50);
                        waited += 50;
                }

                if (!DoesEntityExist(entity)) {
                        DeleteEntity(entity);
                        await this.db.setVehicleStatus(vehicleId, "stored");
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                this.spawnedEntities.set(entity, vehicleId);

                sendChatMessage(source, "^#5e81ac[INFO] ^#ffffffSuccessfully spawned vehicle.");
                await sendLog(`[VEHICLE] ${getPlayerDisplayName(source)} (${source}) spawned vehicle #${vehicleId} (${vehicle.model}) [${vehicle.plate}] at ${coords[0].toFixed(2)} ${coords[1].toFixed(2)} ${coords[2].toFixed(2)}.`);

                return true;
        }

        public async returnVehicle(source: number, args: { vehicleId: number }): Promise<boolean> {
                const license = getPlayerLicense(source);
                if (!license) return false;

                const { vehicleId } = args;
                if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffInvalid vehicle ID.");
                        return false;
                }

                const ped = GetPlayerPed(source);
                if (ped === 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffCould not find your character.");
                        return false;
                }

                const coords = GetEntityCoords(ped, true);
                if (!getArea({ x: coords[0], y: coords[1], z: coords[2] }, Config.Impound.Location)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not in the impound area!");
                        return false;
                }

                const vehicle = await this.db.getVehicle(vehicleId);
                if (!vehicle) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffSomething went wrong.");
                        return false;
                }

                if (vehicle.owner !== license) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not the owner of this vehicle!");
                        return false;
                }

                const returned = await this.db.setVehicleStatusAtomic(vehicleId, "stored", "impound");
                if (!returned) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffVehicle is not impounded!");
                        return false;
                }

                emitNet("fivem-parking:client:updateVehicleStatus", source, vehicleId, "stored");
                sendChatMessage(source, "^#5e81ac[INFO] ^#ffffffSuccessfully returned vehicle from impound.");
                await sendLog(`[VEHICLE] ${getPlayerDisplayName(source)} (${source}) returned vehicle #${vehicleId} from impound.`);

                return true;
        }

        public async adminGiveVehicle(source: number, args: { model: string; playerId: number }): Promise<boolean> {
                if (!IsPlayerAceAllowed(String(source), Config.Group)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou do not have permission to use this command.");
                        return false;
                }

                const license = getPlayerLicense(source);
                if (!license) return false;

                if (!isValidModelName(args.model)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffInvalid vehicle model name.");
                        return false;
                }

                const targetLicense = getPlayerLicense(args.playerId);
                if (!targetLicense) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffNo player with the specified ID found.");
                        return false;
                }

                const plate = await this.generateUniquePlate();
                const vehicleId = await this.db.insertVehicle(plate, targetLicense, args.model, "stored");
                if (!vehicleId) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to give vehicle.");
                        return false;
                }

                sendChatMessage(source, "^#5e81ac[INFO] ^#ffffffSuccessfully spawned vehicle.");
                return true;
        }

        public async adminDeleteVehicle(source: number, args: { plate: string }): Promise<boolean> {
                if (!IsPlayerAceAllowed(String(source), Config.Group)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou do not have permission to use this command.");
                        return false;
                }

                const license = getPlayerLicense(source);
                if (!license) return false;

                if (!isValidPlate(args.plate)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffInvalid plate number.");
                        return false;
                }

                const existing = await this.db.getVehicleByPlate(args.plate);
                if (!existing) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to find vehicle.");
                        return false;
                }

                const success = await this.db.deleteVehicle(args.plate);
                if (!success) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to delete vehicle with the specified plate number from the database.");
                        return false;
                }

                sendChatMessage(source, "^#5e81ac[INFO] ^#ffffffSuccessfully deleted vehicle with the specified plate number from the database.");
                return true;
        }

        public async adminSetVehicle(source: number, args: { model: string }): Promise<boolean> {
                if (!IsPlayerAceAllowed(String(source), Config.Group)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou do not have permission to use this command.");
                        return false;
                }

                const license = getPlayerLicense(source);
                if (!license) return false;

                if (!isValidModelName(args.model)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffInvalid vehicle model name.");
                        return false;
                }

                const ped = GetPlayerPed(source);
                if (ped === 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffCould not find your character.");
                        return false;
                }

                const coords = GetEntityCoords(ped, true);
                const heading = GetEntityHeading(ped);
                const plate = await this.generateUniquePlate();
                const rad = (heading * Math.PI) / 180;
                const spawnX = coords[0] + Math.sin(-rad) * 5;
                const spawnY = coords[1] + Math.cos(-rad) * 5;

                const entity = CreateVehicleServerSetter(GetHashKey(args.model), "automobile", spawnX, spawnY, coords[2] + 1, heading);
                if (!entity) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                SetVehicleNumberPlateText(entity, plate);

                const vehicleId = await this.db.insertVehicle(plate, license, args.model, "outside");
                if (!vehicleId) {
                        DeleteEntity(entity);
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                let waited = 0;
                while (!DoesEntityExist(entity) && waited < 3000) {
                        await Cfx.Delay(50);
                        waited += 50;
                }

                this.spawnedEntities.set(entity, vehicleId);

                sendChatMessage(source, "^#5e81ac[INFO] ^#ffffffSuccessfully spawned vehicle.");
                return true;
        }

        public async adminViewVehicles(source: number, args: { playerId: number }): Promise<boolean> {
                if (!IsPlayerAceAllowed(String(source), Config.Group)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou do not have permission to use this command.");
                        return false;
                }

                const license = getPlayerLicense(source);
                if (!license) return false;

                const targetLicense = getPlayerLicense(args.playerId);
                if (!targetLicense) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffNo player with the specified ID found.");
                        return false;
                }

                const vehicles = await this.db.getOwnedVehicles(targetLicense);
                if (vehicles.length === 0) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffNo vehicles found for player with the specified ID.");
                        return false;
                }

                const targetName = getPlayerDisplayName(args.playerId);
                emitNet("fivem-parking:client:listVehicles", source, vehicles, `${targetName}'s Vehicles`, true);
                await sendLog(`${getPlayerDisplayName(source)} (${source}) viewed vehicles for ${targetName} (${args.playerId}).`);

                return true;
        }
}

export const garage = new Garage(db);
