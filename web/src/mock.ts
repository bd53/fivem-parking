const MOCK_VEHICLES = [
        { id: 1, plate: "ABC1234", model: "adder", stored: "stored" },
        { id: 2, plate: "XYZ9999", model: "zentorno", stored: "outside" },
        { id: 3, plate: "IMP0001", model: "t20", stored: "impound" },
        { id: 4, plate: "NOSTAT1", model: "sultan", stored: null },
        { id: 5, plate: "GRG0002", model: "elegy", stored: "stored" },
        { id: 6, plate: "OUT0003", model: "infernus", stored: "outside" },
        { id: 7, plate: "IMP0002", model: "buffalo", stored: "impound" },
        { id: 8, plate: "STR0004", model: "banshee", stored: "stored" },
        { id: 9, plate: "OUT0005", model: "comet2", stored: "outside" },
        { id: 10, plate: "IMP0003", model: "rapidgt", stored: "impound" },
        { id: 11, plate: "GRG0006", model: "schafter2", stored: "stored" },
        { id: 12, plate: "NON0007", model: "monroe", stored: null },
];

function showUI() {
        window.dispatchEvent(
                new MessageEvent("message", {
                        data: {
                                action: "show",
                                title: "Your Vehicles",
                                vehicles: MOCK_VEHICLES,
                                readonly: false,
                        },
                }),
        );
}

const fe = window.fetch.bind(window);
window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith("https://fivem-parking/")) {
                const action = url.replace("https://fivem-parking/", "");
                const body = init?.body ? JSON.parse(init.body as string) : {};
                console.info(`NUI callback -> ${action}`, body);
                setTimeout(showUI, 50);
                return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return fe(input, init);
};

setTimeout(showUI, 100);
