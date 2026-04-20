onNet("fivem-parking:client:listVehicles", (vehicles: { id: number; plate: string; model: string; stored: string | null }[], title?: string, readonly?: boolean) => {
        SetNuiFocus(true, true);
        SendNUIMessage({ action: "show", vehicles, title: title ?? "Your Vehicles", readonly: readonly ?? false });
});

RegisterNuiCallbackType("spawnVehicle");
on("__cfx_nui:spawnVehicle", (data: { vehicleId: number }, cb: (result: string) => void) => {
        emitNet("fivem-parking:server:spawnVehicle", data.vehicleId);
        SetNuiFocus(false, false);
        cb("{}");
});

RegisterNuiCallbackType("returnVehicle");
on("__cfx_nui:returnVehicle", (data: { vehicleId: number }, cb: (result: string) => void) => {
        emitNet("fivem-parking:server:returnVehicle", data.vehicleId);
        cb("{}");
});

onNet("fivem-parking:client:updateVehicleStatus", (vehicleId: number, stored: string) => {
        SendNUIMessage({ action: "updateVehicleStatus", vehicleId, stored });
});

RegisterNuiCallbackType("close");
on("__cfx_nui:close", (_data: object, cb: (result: string) => void) => {
        SetNuiFocus(false, false);
        cb("{}");
});
