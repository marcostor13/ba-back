export interface QuoteConfigItem {
    description: string;
    price: number;
    type: 'FIXED' | 'PER_UNIT';
    unit?: string;
    quantityField?: string;
}

// This object simulates your Excel pricing rules.
// I have created a plausible entry for every field.
export const KITCHEN_QUOTE_CONFIG: Record<string, QuoteConfigItem> = {
    // --- GENERAL & DEMOLITION ---
    skyScraper: { description: 'High-Rise / Skyscraper Surcharge', price: 1500, type: 'FIXED' },
    crawspace: { description: 'Crawlspace Access Surcharge', price: 750, type: 'FIXED' },
    dumpsterOnSite: { description: 'On-site Dumpster Rental', price: 550, type: 'FIXED' },
    removeNonLoadWall: { description: 'Remove Non-Load Bearing Wall', price: 75, type: 'PER_UNIT', unit: 'LF' },
    removeLVLWall: { description: 'Remove LVL Load-Bearing Wall', price: 125, type: 'PER_UNIT', unit: 'LF' },
    removeMetalWall: { description: 'Remove Metal Stud Wall', price: 95, type: 'PER_UNIT', unit: 'LF' },
    recessedBeam: { description: 'Recess Beam into Ceiling', price: 250, type: 'PER_UNIT', unit: 'LF' },
    supportBasement: { description: 'Add Support in Basement for new Load', price: 1800, type: 'FIXED' },
    supportSlab: { description: 'Add Support on Slab for new Load', price: 1200, type: 'FIXED' },
    engineeringReport: { description: 'Engineering Report for Structural Changes', price: 900, type: 'FIXED' },
    beamWrapCedar: { description: 'Wrap Beam in Cedar', price: 65, type: 'PER_UNIT', unit: 'LF' },
    demoElectricWiring: { description: 'Demo Existing Electrical Wiring', price: 500, type: 'FIXED' },
    buildNewWall: { description: 'Build New Wall', price: 60, type: 'PER_UNIT', unit: 'LF' },
    relocateWall: { description: 'Relocate Existing Wall', price: 90, type: 'PER_UNIT', unit: 'LF' },

    // --- ELECTRICAL ---
    plugMold: { description: 'Install Plug Mold Under-Cabinet Outlet Strips', price: 85, type: 'PER_UNIT', unit: 'LF' },
    ledLighting: { description: 'Install Under-Cabinet LED Lighting', price: 75, type: 'PER_UNIT', unit: 'LF' },
    puckLights: { description: 'Install In-Cabinet Puck Lights', price: 120, type: 'PER_UNIT', unit: 'each' },
    canLightFour: { description: 'Install up to 8 4" Can Lights', price: 1200, type: 'FIXED' },
    canLightSix: { description: 'Install up to 8 6" Can Lights', price: 1350, type: 'FIXED' },
    pendantLights: { description: 'Install Pendant Lights', price: 250, type: 'PER_UNIT', unit: 'each' },
    relocateRange220: { description: 'Relocate 220V Range Outlet', price: 450, type: 'PER_UNIT', unit: 'ft' },
    runPowerRange220: { description: 'Run New 220V Power for Range', price: 750, type: 'PER_UNIT', unit: 'each' },
    addBreaker: { description: 'Add New Breaker to Panel', price: 175, type: 'PER_UNIT', unit: 'each' },
    installAirSwitch: { description: 'Install Air Switch for Disposal', price: 220, type: 'FIXED' },
    reuseSwitch: { description: 'Reuse Existing Switches', price: 25, type: 'PER_UNIT', unit: 'each' },
    addNewSwitch: { description: 'Add New Light Switch', price: 150, type: 'PER_UNIT', unit: 'each' },
    addNewDimmer: { description: 'Add New Dimmer Switch', price: 190, type: 'PER_UNIT', unit: 'each' },
    addSubpanel50: { description: 'Add 50A Subpanel', price: 900, type: 'FIXED' },
    addSubpanel100: { description: 'Add 100A Subpanel', price: 1400, type: 'FIXED' },
    upgradePanel: { description: 'Upgrade Main Electrical Panel', price: 2500, type: 'FIXED' },
    disposalWiring: { description: 'New Wiring for Garbage Disposal', price: 280, type: 'FIXED' },

    // --- PLUMBING & GAS ---
    runNewDrainSupply: { description: 'Run New Drain & Supply Lines for Sink', price: 800, type: 'FIXED' },
    relocateSinkPlumbing: { description: 'Relocate Sink Plumbing', price: 80, type: 'PER_UNIT', unit: 'ft' },
    relocateFridgeWaterLine: { description: 'Relocate Fridge Water Line', price: 45, type: 'PER_UNIT', unit: 'ft' },
    installNewFridgeWaterBox: { description: 'Install New Fridge Water Box', price: 250, type: 'FIXED' },
    runNewGasLine: { description: 'Run New Gas Line', price: 95, type: 'PER_UNIT', unit: 'ft' },
    relocateGasLine: { description: 'Relocate Existing Gas Line', price: 65, type: 'PER_UNIT', unit: 'ft' },
    reworkSinkPlumbing: { description: 'Rework Existing Sink Plumbing for New Sink', price: 350, type: 'FIXED' },
    runWaterlinePotFiller: { description: 'Run Waterline for Pot Filler', price: 700, type: 'FIXED' },
    installFaucet: { description: 'Install New Faucet', price: 200, type: 'FIXED' },
    concreteCutPatch: { description: 'Concrete Cutting and Patching for Plumbing', price: 150, type: 'PER_UNIT', unit: 'LF', quantityField: 'concreteCutPatchQuantity' },

    // --- INSULATION & WINDOWS ---
    installNewInsulationR13: { description: 'Install R13 Insulation', price: 4, type: 'PER_UNIT', unit: 'SF', quantityField: 'installNewInsulationR13Quantity' },
    newWindowDoubleHung: { description: 'Install New Double Hung Window', price: 800, type: 'PER_UNIT', unit: 'each' },
    newWindowPictureWindow: { description: 'Install New Picture Window', price: 1200, type: 'PER_UNIT', unit: 'each' },
    newWindowCasement: { description: 'Install New Casement Window', price: 950, type: 'PER_UNIT', unit: 'each' },
    windowRemoval: { description: 'Window Removal and Wall Patch', price: 600, type: 'FIXED' },

    // --- CABINETS ---
    basic36UpperCabinets: { description: 'Basic 36" Upper Cabinets', price: 180, type: 'PER_UNIT', unit: 'LF' },
    basic42UpperCabinets: { description: 'Basic 42" Upper Cabinets', price: 210, type: 'PER_UNIT', unit: 'LF' },
    basicBaseCabinet: { description: 'Basic Base Cabinets', price: 160, type: 'PER_UNIT', unit: 'LF' },
    premiumBaseCabinet: { description: 'Premium Base Cabinets', price: 280, type: 'PER_UNIT', unit: 'LF' },
    luxuryBaseCabinet: { description: 'Luxury Base Cabinets', price: 450, type: 'PER_UNIT', unit: 'LF' },
    stackersWithGlass12: { description: '12" Stackers with Glass', price: 150, type: 'PER_UNIT', unit: 'each' },
    stackersWithoutGlass12: { description: '12" Stackers without Glass', price: 110, type: 'PER_UNIT', unit: 'each' },
    hardwareInstallationPuttyDrill: { description: 'Hardware Installation (Putty, Drill New Holes)', price: 15, type: 'FIXED' },
    floatingShelvesMatch: { description: 'Floating Shelves (Match Cabinets)', price: 120, type: 'PER_UNIT', unit: 'LF' },

    // --- VENTILATION & PLASTER ---
    woodHoodVent30: { description: '30" Wood Hood Vent Installation', price: 600, type: 'FIXED' },
    woodHoodVent36: { description: '36" Wood Hood Vent Installation', price: 750, type: 'FIXED' },
    plasterSmoothCeilings: { description: 'Plaster - Smooth Ceilings', price: 1200, type: 'FIXED' },
    ventilationHoodExteriorWall: { description: 'Vent Hood through Exterior Wall', price: 650, type: 'FIXED' },

    // --- COUNTERTOPS & SINKS ---
    countertopsQuartzBasic: { description: 'Countertops - Basic Quartz', price: 70, type: 'PER_UNIT', unit: 'SF', quantityField: 'kitchenSquareFootage' },
    countertopsQuartzPremium: { description: 'Countertops - Premium Quartz', price: 95, type: 'PER_UNIT', unit: 'SF', quantityField: 'kitchenSquareFootage' },
    countertopTemplateFeeMedium: { description: 'Countertop Templating Fee (Medium Kitchen)', price: 450, type: 'FIXED' },
    edgingBevel: { description: 'Countertop Edging - Bevel', price: 22, type: 'PER_UNIT', unit: 'LF', quantityField: 'edgingBevelQuantity' },
    edgingMiteredEdge: { description: 'Countertop Edging - Mitered Edge', price: 55, type: 'PER_UNIT', unit: 'LF', quantityField: 'edgingMiteredEdgeQuantity' },
    cutoutsSinkFaucet: { description: 'Sink & Faucet Cutouts', price: 150, type: 'PER_UNIT', unit: 'each' },
    cutoutsCooktop: { description: 'Cooktop Cutout', price: 200, type: 'FIXED' },
    sinkStainlessSteelUndermount: { description: 'Sink - Stainless Steel Undermount', price: 400, type: 'FIXED' },
    sinkFarmhouseFireclay: { description: 'Sink - Farmhouse Fireclay', price: 900, type: 'FIXED' },
    sinkBuildStructure: { description: 'Build Support Structure for Farmhouse Sink', price: 350, type: 'FIXED' },

    // --- BACKSPLASH ---
    backsplashPrep: { description: 'Preparation for Backsplash Installation', price: 300, type: 'FIXED' },
    backsplashTile: { description: 'Tile Backsplash Installation', price: 25, type: 'PER_UNIT', unit: 'SF', quantityField: 'backsplashTileQuantity' },
    backsplashQuartz: { description: 'Quartz Slab Backsplash Installation', price: 60, type: 'PER_UNIT', unit: 'SF', quantityField: 'backsplashQuartzQuantity' },

    // --- DRYWALL & APPLIANCES ---
    drywallSmoothCeilingsPopcorn: { description: 'Smooth Ceilings (Remove Popcorn)', price: 8, type: 'PER_UNIT', unit: 'SF', quantityField: 'drywallSmoothCeilingsPopcornQuantity' },
    drywallRemoveWallpaper: { description: 'Remove Wallpaper & Prep Walls', price: 5, type: 'PER_UNIT', unit: 'SF' }, // Assuming it will be calculated based on kitchenSquareFootage
    drywallRepairsCeilingWalls: { description: 'Drywall Repairs on Ceilings & Walls', price: 500, type: 'FIXED' },
    applianceCooktop: { description: 'Cooktop Installation', price: 250, type: 'FIXED' },
    applianceDoubleOven: { description: 'Double Oven Installation', price: 450, type: 'FIXED' },
    applianceDishwasher: { description: 'Dishwasher Installation', price: 200, type: 'FIXED' },
    applianceDisposal: { description: 'Garbage Disposal Installation', price: 180, type: 'FIXED' },

    // --- TRIM & PAINT ---
    trimBaseboards: { description: 'Install Baseboards', price: 8, type: 'PER_UNIT', unit: 'LF', quantityField: 'trimBaseboardsQuantity' },
    trimCrown: { description: 'Install Crown Molding', price: 12, type: 'PER_UNIT', unit: 'LF', quantityField: 'trimCrownQuantity' },
    paintCeiling: { description: 'Paint Ceiling', price: 2.5, type: 'PER_UNIT', unit: 'SF', quantityField: 'paintCeilingQuantity' },
    paintWalls: { description: 'Paint Walls', price: 3, type: 'PER_UNIT', unit: 'SF', quantityField: 'paintWallsQuantity' },
    paintTrim: { description: 'Paint Trim', price: 4, type: 'PER_UNIT', unit: 'LF', quantityField: 'paintTrimQuantity' },
    paintDoor: { description: 'Paint Door', price: 150, type: 'PER_UNIT', unit: 'each', quantityField: 'paintDoorQuantity' },
};