/**
 * Tipo para kitchenInformation basado en inputs.json
 * Cada campo corresponde al 'name' de cada input del formulario
 */
export interface KitchenInformation {
    // Kitchen Information básica
    kitchenSquareFootage?: number | string;
    kitchenLength?: number | string;
    kitchenWidth?: number | string;
    ceilingHeight?: string;
    wallCabinetHeight?: string;
    stackers?: string;
    cabinetsToCeiling?: string | boolean;

    // Location Kitchen
    mainFloor?: boolean;
    upstairs?: boolean;
    basement?: boolean;
    skyScraperTallBuilding?: boolean;

    // Subfloor
    basementFINISHED?: boolean;
    basementUNFINISHED?: boolean;
    crawlspace?: boolean;

    // Demolition
    demolition?: string | boolean;
    eliminateDrywallPantryLoadBearing?: boolean;
    eliminateDrywallPantryNonLoadBearing?: boolean;
    dumpsterOnSite?: boolean;

    // Wall Demo
    removeOneWallNonLoadBearing?: number | string;
    removeLoadBearingWallWLvlBeam?: number | string;
    removeLoadBearingWallWMetalBeam?: number | string;
    recessedBeam?: string | boolean;
    additionalSupportInBasementCrawlSpace?: string | boolean;
    additionalSupportOnSlab?: string | boolean;
    enegeeringReportRequiredForLoadBearingWall?: string | boolean;
    beamWrapWithCedar?: number | string;
    demoElectricoWiringInsideWalls?: string | boolean;

    // Framing
    frameNewWall?: string | boolean;
    relocateWall?: string | boolean;

    // Electrical
    underCabinetPlugMolds?: string | boolean;
    lEDUnderCabinetLighting?: string | boolean;
    puckLightsInGlassCabinets?: string | boolean;
    installCanLight?: string;
    installPendantLights?: number | string;
    relocatePowerForNewRangeLocationTwoHundredTwentyVolt?: number | string;
    relocatePowerForNewRangeLocationOneHundredTwentyVolt?: number | string;
    relocatePowerForNewCooktopLocationTwoHundredTwentyVolt?: number | string;
    relocatePowerForNewCooktopLocationOneHundredTwentyVolt?: number | string;
    relocatePowerForNewDoubleOvenLocationTwoHundredTwentyVolt?: number | string;
    relocatePowerForNewFridgeLocationOneHundredTwentyVolt?: number | string;
    relocatePowerForNewDishwasherLocationOneHundredTwentyVolt?: number | string;
    relocatePowerForNewHoodInsertLocationOneHundredTwentyVolt?: number | string;
    relocatePowerForNewMicrowaveLocationOneHundredTwentyVolt?: number | string;
    relocatePowerForNewIslandOneHundredTwentyVolt?: number | string;
    runPowerForNewRangeTwoHundredTwentyVolt?: number | string;
    runPowerForNewRangeOneHundredTwentyVolt?: number | string;
    runPowerForNewCooktopTwoHundredTwentyVolt?: number | string;
    runPowerForNewCooktopOneHundredTwentyVolt?: number | string;
    runPowerForNewDoubleOvenTwoHundredTwentyVolt?: number | string;
    runPowerForNewHoodInsertOneHundredTwentyVolt?: number | string;
    runPowerForNewMicrowaveOneHundredTwentyVolt?: number | string;
    runPowerForNewIslandOneHundredTenVolt?: number | string;
    addingOutletsFromExistingPower?: number | string;
    addingOutletsRunPower?: number | string;
    addBreaker?: number | string;
    installAirSwitch?: string | boolean;
    reuseSwitch?: number | string;
    addNewSwitch?: number | string;
    addNewDimmer?: number | string;
    keepSwitchOnWall?: string | boolean;
    addSubpanelFiftyAmp?: string | boolean;
    addSubpanelOneHundredAmp?: string | boolean;
    upgradePanel?: string;
    relocateSwitchesOutletsFromWallRemoval?: string | boolean;
    dishwasherWiring?: number | string;
    disposalWiring?: string | boolean;

    // Plumbing
    runNewDrainAndSupplyLines?: string | boolean;
    relocateSinkPlumbing?: number | string;
    relocateFridgeWaterLine?: number | string;
    installNewFridgeWaterBox?: string | boolean;
    relocateDishwasher?: string | boolean;
    installNewWaterLineDishwasher?: number | string;
    runNewGasLine?: number | string;
    relocateGasLine?: number | string;
    reworkSinkPlumbing?: string | boolean;
    runWaterlineAndInstallNewPotFiller?: string | boolean;
    installFaucet?: string | boolean;
    concreteCutPatch?: string | boolean;
    installNewInsulationRThirteen?: string | boolean;

    // Window
    newWindowDoubleHung?: number | string;
    newWindowPictureWindow?: number | string;
    newWindowCasement?: number | string;
    windowRemoval?: number | string;
    relocateWindow?: number | string;

    // Cabinets - Basic
    upperCabinetsThirtySix?: number | string;
    upperCabinetsFortyTwo?: number | string;
    baseCabinet?: number | string;
    tallCabinets?: number | string;
    trimWork?: string | boolean;
    installation?: string | boolean;

    // Cabinets - Premium
    upperCabinetThirty?: number | string; // Premium
    // Nota: upperCabinetsThirtySix, upperCabinetsFortyTwo, baseCabinet, tallCabinets también se usan en premium

    // Cabinets - Luxury
    // Nota: Similar a premium pero con diferentes precios

    // Stackers
    stackersTwelve?: number | string; // Con y sin glass
    stackersFifteen?: number | string; // Con y sin glass
    stackersEighteen?: number | string; // Con y sin glass

    // Otros cabinets
    widePocketDoorsThirtySixToFortyTwo?: number | string;
    glassDoors?: number | string;
    hardwareInstallation?: string | boolean;
    paintingCabinetsExistingPaintColor?: number | string;
    paintingCabinetsExistingStainColor?: number | string;
    hardwareInstallationExistingHoles?: boolean;
    hardwareInstallationPuttyExistingAndDrillNewHoles?: boolean;

    // Shelving
    glassShelvesTwelveInch?: number | string;
    floatingMatchCabinets?: number | string;
    floatingCustom?: number | string;

    // Wood Hood Vent
    woodHoodVentThirty?: boolean;
    woodHoodVentThirtySix?: boolean;
    woodHoodVentFortyEight?: boolean;
    woodHoodVentSixty?: boolean;
    plaster?: string | boolean;

    // Ventilation Hood
    exteriorWall?: boolean;
    atticRoof?: boolean;
    garage?: boolean;
    recirculating?: boolean;

    // Countertops
    quartz?: string | boolean;
    quartzite?: string | boolean;
    granite?: string | boolean;
    marble?: string | boolean;
    otherCountertops?: string;

    // Countertop Template Fee
    counteropTemplateFee?: string | boolean;

    // Edging
    easedAndPolished?: number | string;
    bevel?: number | string;
    bullnose?: number | string;
    halfBullnose?: number | string;
    ogee?: number | string;
    miteredEdgeThickEdge?: number | string;

    // Cutouts
    sinkAndFaucetCutout?: string | boolean;
    cooktopCutout?: string | boolean;
    additonalCuts?: number | string;

    // Sink Selection
    stainlessSteelUndermount?: boolean;
    blancoUndermountSinkGraniteComposite?: boolean;
    farmhouseSinkFireclay?: boolean;
    farmhouseSinkStainlessSteel?: boolean;
    farhouseSinkBlanco?: boolean;
    castIronUndermount?: boolean;
    buildStructure?: boolean;

    // Backsplash
    prep?: string | boolean;
    tile?: string | boolean;
    quartzBacksplash?: string | boolean;
    quartziteBacksplash?: string | boolean;
    graniteBacksplash?: string | boolean;
    marbleBacksplash?: string | boolean;
    otherBacksplash?: string;
    stoneBacksplashTemplateFee?: string | boolean;

    // Drywall
    smoothCeilings?: string;
    removeWallpaper?: string | boolean;
    drywallRepairsCeilingWalls?: string | boolean;

    // Appliance Installation
    freeStandingRange?: string;
    cooktopInstallation?: string | boolean;
    doubleOven?: string | boolean;
    hoodInsert?: string | boolean;
    mircowave?: string;
    fridge?: string;
    beverageFridgeWineFridge?: boolean;
    iceMaker?: string;
    washAndDryer?: string | boolean;
    dishwasherInstallation?: string | boolean;
    disposalInstallation?: string | boolean;

    // Trim
    roundShoemold?: number | string;
    baseboards?: string | boolean;
    crown?: string | boolean;
    doorCasing?: string | boolean;

    // Painting
    paintCeilingTwoCoats?: string | boolean;
    paintWallsTwoCoats?: string | boolean;
    trimCrownBaseCasing?: string | boolean;
    doorPaint?: string | boolean;
    windowPaint?: string | boolean;
    exteriorDoorPaint?: string | boolean;
    exteriorDoorStainAndSeal?: string | boolean;

    // Campos adicionales que pueden venir del frontend
    [key: string]: unknown;
}

