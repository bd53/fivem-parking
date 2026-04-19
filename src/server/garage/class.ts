import * as Cfx from "@nativewrappers/fivem";
import Config from "../../common/config";
import { generatePlate, getArea, getPlayerDisplayName, getPlayerLicense, isValidModelName, isValidPlate, sendChatMessage, sendLog } from "../../common/utils";
import db from "../db";

export class Garage {
        public async listVehicles(source: number) {
                const license = getPlayerLicense(source);
                if (!license) return [];

                const vehicles = await db.getOwnedVehicles(license);
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

                const vehicle = await db.getVehicleByPlate(plate);
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

                DeleteEntity(entity);
                await db.setVehicleStatus(vehicle.id, "stored");

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

                const vehicle = await db.getVehicle(vehicleId);
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
                const coords = GetEntityCoords(ped, true);
                const heading = GetEntityHeading(ped);
                const rad = (heading * Math.PI) / 180;
                const spawnX = coords[0] + Math.sin(-rad) * 5;
                const spawnY = coords[1] + Math.cos(-rad) * 5;

                const entity = CreateVehicleServerSetter(GetHashKey(vehicle.model), "automobile", spawnX, spawnY, coords[2] + 1, heading);
                if (!entity) {
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
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                await db.setVehicleStatus(vehicleId, "outside");
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

                const coords = GetEntityCoords(GetPlayerPed(source), true);
                if (!getArea({ x: coords[0], y: coords[1], z: coords[2] }, Config.Impound.Location)) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not in the impound area!");
                        return false;
                }

                const vehicle = await db.getVehicle(vehicleId);
                if (!vehicle) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffSomething went wrong.");
                        return false;
                }

                if (vehicle.owner !== license) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffYou are not the owner of this vehicle!");
                        return false;
                }

                if (vehicle.stored !== "impound") {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffVehicle is not impounded!");
                        return false;
                }

                // Add your inventory check here before deducting (Config.Impound.Cost is the amount).
                // Add your money deduction here.

                await db.setVehicleStatus(vehicleId, "stored");
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

                const plate = generatePlate();
                const result = await db.insertVehicle(plate, targetLicense, args.model, "stored");
                if (!result) {
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

                const existing = await db.getVehicleByPlate(args.plate);
                if (!existing) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to find vehicle.");
                        return false;
                }

                const success = await db.deleteVehicle(args.plate);
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
                const coords = GetEntityCoords(ped, true);
                const heading = GetEntityHeading(ped);
                const plate = generatePlate();
                const rad = (heading * Math.PI) / 180;
                const spawnX = coords[0] + Math.sin(-rad) * 5;
                const spawnY = coords[1] + Math.cos(-rad) * 5;

                const entity = CreateVehicleServerSetter(GetHashKey(args.model), "automobile", spawnX, spawnY, coords[2] + 1, heading);
                if (!entity) {
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                SetVehicleNumberPlateText(entity, plate);

                const result = await db.insertVehicle(plate, license, args.model, "outside");
                if (!result) {
                        DeleteEntity(entity);
                        sendChatMessage(source, "^#d73232ERROR ^#ffffffFailed to spawn the vehicle.");
                        return false;
                }

                let waited = 0;
                while (!DoesEntityExist(entity) && waited < 3000) {
                        await Cfx.Delay(50);
                        waited += 50;
                }
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

                const vehicles = await db.getOwnedVehicles(targetLicense);
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
