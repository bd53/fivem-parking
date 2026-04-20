type Vehicle = {
        id: number;
        plate: string;
        owner: string;
        model: string;
        stored: string;
};

const ox = exports.oxmysql;

function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
        return new Promise(resolve => ox.query(sql, params, resolve));
}

function single<T>(sql: string, params: unknown[] = []): Promise<T | null> {
        return new Promise(resolve => ox.single(sql, params, resolve));
}

function insert(sql: string, params: unknown[] = []): Promise<number> {
        return new Promise(resolve => ox.insert(sql, params, resolve));
}

function update(sql: string, params: unknown[] = []): Promise<number> {
        return new Promise(resolve => ox.update(sql, params, resolve));
}

export class Database {
        public async getVehicle(id: number): Promise<Vehicle | null> {
                return single<Vehicle>("SELECT id, plate, owner, model, stored FROM parking_vehicles WHERE id = ? LIMIT 1", [id]);
        }

        public async getVehicleByPlate(plate: string): Promise<Vehicle | null> {
                return single<Vehicle>("SELECT id, plate, owner, model, stored FROM parking_vehicles WHERE plate = ? LIMIT 1", [plate]);
        }

        public async getVehicleOwner(id: number, owner: string): Promise<boolean> {
                const result = await single("SELECT id FROM parking_vehicles WHERE id = ? AND owner = ? LIMIT 1", [id, owner]);
                return result !== null;
        }

        public async getVehicleStatus(id: number, status: string): Promise<boolean> {
                const result = await single("SELECT id FROM parking_vehicles WHERE id = ? AND stored = ? LIMIT 1", [id, status]);
                return result !== null;
        }

        public async getOwnedVehicles(owner: string): Promise<Vehicle[]> {
                return query<Vehicle>("SELECT id, plate, owner, model, stored FROM parking_vehicles WHERE owner = ? ORDER BY id ASC LIMIT 100", [owner]);
        }

        public async setVehicleStatus(id: number, status: string): Promise<boolean> {
                const affected = await update("UPDATE parking_vehicles SET stored = ? WHERE id = ?", [status, id]);
                return affected > 0;
        }

        public async insertVehicle(plate: string, owner: string, model: string, stored: string = "stored"): Promise<boolean> {
                const insertId = await insert("INSERT INTO parking_vehicles (plate, owner, model, stored) VALUES (?, ?, ?, ?)", [plate, owner, model, stored]);
                return insertId > 0;
        }

        public async deleteVehicle(plate: string): Promise<boolean> {
                const affected = await update("DELETE FROM parking_vehicles WHERE plate = ?", [plate]);
                return affected > 0;
        }
}

const db = new Database();

export default db;
