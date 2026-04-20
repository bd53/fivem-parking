type Vehicle = {
        id: number;
        plate: string;
        owner: string;
        model: string;
        stored: string;
};

const ox = exports.oxmysql;

export class Database {
        private query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
                return new Promise(resolve => ox.query(sql, params, resolve));
        }

        private single<T>(sql: string, params: unknown[] = []): Promise<T | null> {
                return new Promise(resolve => ox.single(sql, params, resolve));
        }

        private insert(sql: string, params: unknown[] = []): Promise<number> {
                return new Promise(resolve => ox.insert(sql, params, resolve));
        }

        private update(sql: string, params: unknown[] = []): Promise<number> {
                return new Promise(resolve => ox.update(sql, params, resolve));
        }

        public async getVehicle(id: number): Promise<Vehicle | null> {
                return this.single<Vehicle>("SELECT id, plate, owner, model, stored FROM parking_vehicles WHERE id = ? LIMIT 1", [id]);
        }

        public async getVehicleByPlate(plate: string): Promise<Vehicle | null> {
                return this.single<Vehicle>("SELECT id, plate, owner, model, stored FROM parking_vehicles WHERE plate = ? LIMIT 1", [plate]);
        }

        public async plateExists(plate: string): Promise<boolean> {
                const result = await this.single("SELECT id FROM parking_vehicles WHERE plate = ? LIMIT 1", [plate]);
                return result !== null;
        }

        public async getOwnedVehicles(owner: string): Promise<Vehicle[]> {
                return this.query<Vehicle>("SELECT id, plate, owner, model, stored FROM parking_vehicles WHERE owner = ? ORDER BY id ASC", [owner]);
        }

        public async setVehicleStatus(id: number, status: string): Promise<boolean> {
                const affected = await this.update("UPDATE parking_vehicles SET stored = ? WHERE id = ?", [status, id]);
                return affected > 0;
        }

        public async setVehicleStatusAtomic(id: number, newStatus: string, expectedStatus: string): Promise<boolean> {
                const affected = await this.update("UPDATE parking_vehicles SET stored = ? WHERE id = ? AND stored = ?", [newStatus, id, expectedStatus]);
                return affected > 0;
        }

        public async resetOutsideVehicles(): Promise<number> {
                return this.update("UPDATE parking_vehicles SET stored = 'stored' WHERE stored = 'outside'");
        }

        public async insertVehicle(plate: string, owner: string, model: string, stored: string = "stored"): Promise<number> {
                return this.insert("INSERT INTO parking_vehicles (plate, owner, model, stored) VALUES (?, ?, ?, ?)", [plate, owner, model, stored]);
        }

        public async deleteVehicle(plate: string): Promise<boolean> {
                const affected = await this.update("DELETE FROM parking_vehicles WHERE plate = ?", [plate]);
                return affected > 0;
        }
}

const db = new Database();

export default db;
