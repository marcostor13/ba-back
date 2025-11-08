import { IsOptional, IsNumber, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const toBoolean = (value: unknown): boolean | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    }
    return Boolean(value);
};

// Normaliza números provenientes como string ("123") o valores vacíos
const toOptionalNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
};

// Normaliza strings provenientes como número u otros tipos; deja undefined si es nulo o vacío
const toStringOrUndefined = (value: unknown): string | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    return String(value);
};

// Normaliza un objeto o arreglo en un arreglo de objetos para validación consistente
const toArrayOfObjectsOrUndefined = (value: unknown): Record<string, unknown>[] | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (typeof value === 'object') return [value as Record<string, unknown>];
    return undefined;
};

// Representa un item de media proveniente del front
export class MediaItemDto {
    @IsString() @IsOptional() comment?: string;
    @IsString() @IsOptional() id?: string;
    @IsString() @IsOptional() name?: string;
    @IsString() @IsOptional() type?: string; // image | video | otros
    @IsString() @IsOptional() url?: string;
}

export class CreateKitchenQuoteDto {
    @IsString() @IsOptional() type?: string;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() kitchenSquareFootage?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() kitchenLength?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() kitchenWidth?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() cellingHeight?: number;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() wallCabinetHeight?: number;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() stackers?: number;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() isCabinetsToCelling?: boolean;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() price?: number;
    @Transform(({ value }) => toStringOrUndefined(value)) @IsString() @IsOptional() locationKitchen?: string;
    @IsBoolean() @IsOptional() skyScraper?: boolean;
    @Transform(({ value }) => toStringOrUndefined(value)) @IsString() @IsOptional() subFloor?: string;
    @IsBoolean() @IsOptional() crawspace?: boolean;
    @IsString() @IsOptional() demolition?: string;
    @IsString() @IsOptional() eliminateDrywall?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() dumpsterOnSite?: boolean;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() removeNonLoadWall?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() removeLVLWall?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() removeMetalWall?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() recessedBeam?: number | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() supportBasement?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() supportSlab?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() engineeringReport?: boolean | null;
    @IsString() @IsOptional() beamWrapCedar?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() demoElectricWiring?: boolean | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() buildNewWall?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() relocateWall?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() plugMold?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() ledLighting?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() puckLights?: number | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() canLightFour?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() canLightSix?: boolean;
    @IsString() @IsOptional() pendantLights?: string;
    @IsString() @IsOptional() relocateRange220?: string;
    @IsString() @IsOptional() relocateRange120?: string;
    @IsString() @IsOptional() relocateCooktop220?: string;
    @IsString() @IsOptional() relocateCooktop120?: string;
    @IsString() @IsOptional() relocateDoubleOven220?: string;
    @IsString() @IsOptional() relocateFridge120?: string;
    @IsString() @IsOptional() relocateDishwasher120?: string;
    @IsString() @IsOptional() relocateHoodInsert120?: string;
    @IsString() @IsOptional() relocateMicrowave120?: string;
    @IsString() @IsOptional() relocateIsland120?: string;
    @IsString() @IsOptional() runPowerRange220?: string;
    @IsString() @IsOptional() runPowerRange120?: string;
    @IsString() @IsOptional() runPowerCooktop220?: string;
    @IsString() @IsOptional() runPowerCooktop120?: string;
    @IsString() @IsOptional() runPowerDoubleOven220?: string;
    @IsString() @IsOptional() runPowerHoodInsert120?: string;
    @IsString() @IsOptional() runPowerMicrowave120?: string;
    @IsString() @IsOptional() runPowerIsland110?: string;
    @IsString() @IsOptional() addingOutletsExisting?: string;
    @IsString() @IsOptional() addingOutletsRunPower?: string;
    @IsString() @IsOptional() addBreaker?: string;
    @IsBoolean() @IsOptional() installAirSwitch?: boolean | null;
    @IsOptional() reuseSwitch?: number | null;
    @IsOptional() addNewSwitch?: number | null;
    @IsOptional() addNewDimmer?: number | null;
    @IsBoolean() @IsOptional() keepSwitchOnWall?: boolean | null;
    @IsBoolean() @IsOptional() addSubpanel50?: boolean | null;
    @IsBoolean() @IsOptional() addSubpanel100?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() upgradePanel?: boolean | null;
    @IsBoolean() @IsOptional() upgradePanelDisconnect?: boolean | null;
    @IsBoolean() @IsOptional() relocateSwitchesOutlets?: boolean | null;
    @IsString() @IsOptional() dishwasherWiring?: string;
    @IsBoolean() @IsOptional() disposalWiring?: boolean | null;
    @IsBoolean() @IsOptional() runNewDrainSupply?: boolean | null;
    @IsString() @IsOptional() relocateSinkPlumbing?: string;
    @IsString() @IsOptional() relocateFridgeWaterLine?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() installNewFridgeWaterBox?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() relocateDishwasher?: boolean | null;
    @IsString() @IsOptional() installNewWaterLineDishwasher?: string;
    @IsString() @IsOptional() runNewGasLine?: string;
    @IsString() @IsOptional() relocateGasLine?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() reworkSinkPlumbing?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() runWaterlinePotFiller?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() installFaucet?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() concreteCutPatch?: boolean | null;
    @IsString() @IsOptional() concreteCutPatchQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() installNewInsulationR13?: boolean | null;
    @IsString() @IsOptional() installNewInsulationR13Quantity?: string;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() newWindowDoubleHung?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() newWindowPictureWindow?: number | null;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() newWindowCasement?: number | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() windowRemoval?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() relocateWindow?: boolean | null;
    @IsOptional() basic36UpperCabinets?: number | null;
    @IsOptional() basic42UpperCabinets?: number | null;
    @IsOptional() basicBaseCabinet?: number | null;
    @IsOptional() basicTallCabinets?: number | null;
    @IsString() @IsOptional() basicTrimWork?: string;
    @IsString() @IsOptional() basicInstallation?: string;
    @IsOptional() premium30UpperCabinet?: number | null;
    @IsOptional() premium36UpperCabinets?: number | null;
    @IsOptional() premium42UpperCabinets?: number | null;
    @IsOptional() premiumBaseCabinet?: number | null;
    @IsOptional() premiumTallCabinets?: number | null;
    @IsString() @IsOptional() premiumTrimWork?: string;
    @IsString() @IsOptional() premiumInstallation?: string;
    @IsOptional() luxury30UpperCabinet?: number | null;
    @IsOptional() luxury36UpperCabinets?: number | null;
    @IsOptional() luxury42UpperCabinets?: number | null;
    @IsOptional() luxuryBaseCabinet?: number | null;
    @IsOptional() luxuryTallCabinets?: number | null;
    @IsString() @IsOptional() luxuryTrimWork?: string;
    @IsString() @IsOptional() luxuryInstallation?: string;
    @IsOptional() stackersWithGlass12?: number | null;
    @IsOptional() stackersWithGlass15?: number | null;
    @IsOptional() stackersWithGlass18?: number | null;
    @IsOptional() stackersWithoutGlass12?: number | null;
    @IsOptional() stackersWithoutGlass15?: number | null;
    @IsOptional() stackersWithoutGlass18?: number | null;
    @IsOptional() widePocketDoors?: number | null;
    @IsString() @IsOptional() glassDoors?: string;
    @IsOptional() hardwareInstallationSmall?: number | null;
    @IsOptional() hardwareInstallationMedium?: number | null;
    @IsOptional() hardwareInstallationLarge?: number | null;
    @IsString() @IsOptional() paintingCabinetsPaintColor?: string;
    @IsString() @IsOptional() paintingCabinetsStainColor?: string;
    @IsBoolean() @IsOptional() hardwareInstallationExistingHoles?: boolean | null;
    @IsBoolean() @IsOptional() hardwareInstallationPuttyDrill?: boolean | null;
    @IsString() @IsOptional() glassShelvesHalf?: string;
    @IsString() @IsOptional() floatingShelvesMatch?: string;
    @IsString() @IsOptional() floatingShelvesCustom?: string;
    @IsBoolean() @IsOptional() woodHoodVent30?: boolean;
    @IsBoolean() @IsOptional() woodHoodVent36?: boolean;
    @IsBoolean() @IsOptional() woodHoodVent48?: boolean;
    @IsBoolean() @IsOptional() woodHoodVent60?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() plasterSmoothCeilings?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() plasterPopcorn?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() plasterStomped?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() plasterOrangePeel?: boolean;
    @IsOptional() plaster?: number | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() ventilationHoodExteriorWall?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() ventilationHoodAtticRoof?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() ventilationHoodGarage?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() ventilationHoodRecirculating?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsQuartzBasic?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsQuartzPremium?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsQuartzLuxury?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsQuartziteBasic?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsQuartzitePremium?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsQuartziteLuxury?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsGraniteBasic?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsGranitePremium?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsGraniteLuxury?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsMarbleBasic?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsMarblePremium?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopsMarbleLuxury?: boolean;
    @IsString() @IsOptional() countertopsOther?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopTemplateFeeSmall?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopTemplateFeeMedium?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() countertopTemplateFeeLarge?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() edgingEasedPolished?: boolean;
    @IsString() @IsOptional() edgingEasedPolishedQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() edgingBevel?: boolean;
    @IsString() @IsOptional() edgingBevelQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() edgingBullnose?: boolean;
    @IsString() @IsOptional() edgingBullnoseQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() edgingHalfBullnose?: boolean;
    @IsString() @IsOptional() edgingHalfBullnoseQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() edgingOgee?: boolean;
    @IsString() @IsOptional() edgingOgeeQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() edgingMiteredEdge?: boolean;
    @IsString() @IsOptional() edgingMiteredEdgeQuantity?: string;
    @IsOptional() cutoutsSinkFaucet?: number | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() cutoutsCooktop?: boolean | null;
    @IsString() @IsOptional() cutoutsAdditional?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkStainlessSteelUndermount?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkBlancoUndermount?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkFarmhouseFireclay?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkFarmhouseStainlessSteel?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkFarmhouseBlanco?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkCastIronUndermount?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() sinkBuildStructure?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() backsplashPrep?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() backsplashTile?: boolean;
    @IsString() @IsOptional() backsplashTileQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() backsplashQuartz?: boolean;
    @IsString() @IsOptional() backsplashQuartzQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() backsplashQuartzite?: boolean;
    @IsString() @IsOptional() backsplashQuartziteQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() backsplashGranite?: boolean;
    @IsString() @IsOptional() backsplashGraniteQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() backsplashMarble?: boolean;
    @IsString() @IsOptional() backsplashMarbleQuantity?: string;
    @IsString() @IsOptional() backsplashOther?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() stoneBacksplashTemplateFeeSmall?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() stoneBacksplashTemplateFeeMedium?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() stoneBacksplashTemplateFeeLarge?: boolean;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() drywallSmoothCeilingsPopcorn?: boolean | null;
    @IsString() @IsOptional() drywallSmoothCeilingsPopcornQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() drywallSmoothCeilingsStomped?: boolean | null;
    @IsString() @IsOptional() drywallSmoothCeilingsStompedQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() drywallSmoothCeilingsOrangePeel?: boolean | null;
    @IsString() @IsOptional() drywallSmoothCeilingsOrangePeelQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() drywallRemoveWallpaper?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() drywallRepairsCeilingWalls?: boolean | null;
    @IsString() @IsOptional() applianceFreestandingRange?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceCooktop?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceDoubleOven?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceHoodInsert?: boolean | null;
    @IsString() @IsOptional() applianceMicrowave?: string;
    @IsString() @IsOptional() applianceFridge?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceBeverageFridge?: boolean | null;
    @IsString() @IsOptional() applianceIceMaker?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceWashDryer?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceDishwasher?: boolean | null;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceDisposal?: boolean | null;
    @IsString() @IsOptional() trimQuarterRound?: string;
    @IsString() @IsOptional() trimBaseboards?: string;
    @IsString() @IsOptional() trimBaseboardsQuantity?: string;
    @IsString() @IsOptional() trimCrown?: string;
    @IsString() @IsOptional() trimCrownQuantity?: string;
    @IsString() @IsOptional() trimDoorCasing?: string;
    @IsString() @IsOptional() trimDoorCasingQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintCeiling?: boolean | null;
    @IsString() @IsOptional() paintCeilingQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintWalls?: boolean | null;
    @IsString() @IsOptional() paintWallsQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintTrim?: boolean | null;
    @IsString() @IsOptional() paintTrimQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintDoor?: boolean | null;
    @IsString() @IsOptional() paintDoorQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintWindow?: boolean | null;
    @IsString() @IsOptional() paintWindowQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintExteriorDoor?: boolean;
    @IsString() @IsOptional() paintExteriorDoorQuantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() paintExteriorDoorStainSeal?: boolean;
    @IsString() @IsOptional() paintExteriorDoorStainSealQuantity?: string;
    @IsString() @IsOptional() timeFrame?: string;
    @IsString() @IsOptional() customerBudget?: string;
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() roughQuote?: number | null;
    @IsArray() @IsOptional() projectPhotos?: any[];
    @IsArray() @IsOptional() projectDrawings?: any[];
    @IsArray() @IsOptional() projectContracts?: any[];
    @IsArray() @IsOptional() projectInvoices?: any[];
    @IsArray() @IsOptional() projectOtherDocuments?: any[];

    // Adjuntos multimedia provenientes del front
    @Transform(({ value }) => toArrayOfObjectsOrUndefined(value))
    @IsArray() @ValidateNested({ each: true }) @Type(() => MediaItemDto) @IsOptional()
    countertopsMedia?: MediaItemDto[];

    @Transform(({ value }) => toArrayOfObjectsOrUndefined(value))
    @IsArray() @ValidateNested({ each: true }) @Type(() => MediaItemDto) @IsOptional()
    backsplashMedia?: MediaItemDto[];

    @Transform(({ value }) => toArrayOfObjectsOrUndefined(value))
    @IsArray() @ValidateNested({ each: true }) @Type(() => MediaItemDto) @IsOptional()
    backsplashCommentsMedia?: MediaItemDto[];

    @Transform(({ value }) => toArrayOfObjectsOrUndefined(value))
    @IsArray() @ValidateNested({ each: true }) @Type(() => MediaItemDto) @IsOptional()
    media?: MediaItemDto[];

    // Propiedades adicionales faltantes
    @IsString() @IsOptional() fourLight?: string;
    @IsString() @IsOptional() sixLight?: string;
    @IsString() @IsOptional() reuseSwitchQuantity?: string;
    @IsString() @IsOptional() addNewSwitchQuantity?: string;
    @IsString() @IsOptional() addNewDimmerQuantity?: string;
    @IsString() @IsOptional() installFaucetQuantity?: string;
    @IsString() @IsOptional() afterCanLight4?: string;
    @IsString() @IsOptional() afterCanLight6?: string;
    @IsString() @IsOptional() basic36UpperCabinetsQuantity?: string;
    @IsString() @IsOptional() basic42UpperCabinetsQuantity?: string;
    @IsString() @IsOptional() basicBaseCabinetQuantity?: string;
    @IsString() @IsOptional() basicTallCabinetsQuantity?: string;
    @IsString() @IsOptional() premium30UpperCabinetQuantity?: string;
    @IsString() @IsOptional() premium36UpperCabinetsQuantity?: string;
    @IsString() @IsOptional() premium42UpperCabinetsQuantity?: string;
    @IsString() @IsOptional() premiumBaseCabinetQuantity?: string;
    @IsString() @IsOptional() premiumTallCabinetsQuantity?: string;
    @IsString() @IsOptional() luxury30UpperCabinetQuantity?: string;
    @IsString() @IsOptional() luxury36UpperCabinetsQuantity?: string;
    @IsString() @IsOptional() luxury42UpperCabinetsQuantity?: string;
    @IsString() @IsOptional() luxuryBaseCabinetQuantity?: string;
    @IsString() @IsOptional() luxuryTallCabinetsQuantity?: string;
    @IsString() @IsOptional() stackersWithGlass12Quantity?: string;
    @IsString() @IsOptional() stackersWithGlass15Quantity?: string;
    @IsString() @IsOptional() stackersWithGlass18Quantity?: string;
    @IsString() @IsOptional() stackersWithoutGlass12Quantity?: string;
    @IsString() @IsOptional() stackersWithoutGlass15Quantity?: string;
    @IsString() @IsOptional() stackersWithoutGlass18Quantity?: string;
    @IsString() @IsOptional() widePocketDoorsQuantity?: string;
    @IsString() @IsOptional() woodHoodVent?: string;
    @IsString() @IsOptional() ventilationHood?: string;
    @IsString() @IsOptional() countertops?: string;
    @IsString() @IsOptional() countertopTemplateFee?: string;
    @IsString() @IsOptional() newWindowDoubleHungQuantity?: string;
    @IsString() @IsOptional() newWindowPictureWindowQuantity?: string;
    @IsString() @IsOptional() newWindowCasementQuantity?: string;
    @IsString() @IsOptional() windowRemovalQuantity?: string;
    @IsString() @IsOptional() relocateWindowQuantity?: string;
    @IsString() @IsOptional() customerNotes?: string;
    @IsString() @IsOptional() voiceRecording?: string;
    @IsString() @IsOptional() transcription?: string;
    @IsArray() @IsOptional() pdfFiles?: any[];
    @IsString() @IsOptional() estimateResult?: string;
    @IsOptional() drawingData?: any;
    @IsOptional() pressureData?: any;
    @IsOptional() tiltData?: any;

    // Propiedades adicionales reportadas por frontend
    @IsOptional() plugMoldSmall?: number | null;
    @IsOptional() plugMoldMedium?: number | null;
    @IsOptional() plugMoldLarge?: number | null;

    @IsOptional() ledLightingSmall?: number | null;
    @IsOptional() ledLightingMedium?: number | null;
    @IsOptional() ledLightingLarge?: number | null;

    @IsOptional() puckLightsSmall?: number | null;
    @IsOptional() puckLightsMedium?: number | null;
    @IsOptional() puckLightsLarge?: number | null;

    @IsString() @IsOptional() woodHoodVentSize?: string;

    @IsOptional() @Transform(({ value }) => toBoolean(value)) countertopsQuartz?: boolean | null;
    @IsOptional() @Transform(({ value }) => toBoolean(value)) countertopsQuartzite?: boolean | null;
    @IsOptional() @Transform(({ value }) => toBoolean(value)) countertopsGranite?: boolean | null;
    @IsOptional() @Transform(({ value }) => toBoolean(value)) countertopsMarble?: boolean | null;

    @IsString() @IsOptional() countertopsComments?: string;
    @IsString() @IsOptional() countertopsQuartzQuantity?: string;
    @IsString() @IsOptional() countertopsQuartziteQuantity?: string;
    @IsString() @IsOptional() countertopsGraniteQuantity?: string;
    @IsString() @IsOptional() countertopsMarbleQuantity?: string;

    @IsString() @IsOptional() trimQuarterRoundQuantity?: string;

    @IsOptional() @Transform(({ value }) => toBoolean(value)) sinkComposite?: boolean | null;

    @IsString() @IsOptional() drawingUrl?: string;

    @IsString() @IsOptional() backsplashComments?: string;
    @IsString() @IsOptional() drywallServices?: string;

    @IsString() @IsOptional() paintPrimeCeilingWalls?: string;
    @IsString() @IsOptional() paintTrimCrownBaseCasing?: string;
    @IsString() @IsOptional() paintCeilingWalls?: string;

    @IsString() @IsOptional() canLightSize?: string;
    @IsString() @IsOptional() canLightQuantity?: string;

    // Nuevos campos reportados por frontend (para compatibilidad)
    @Transform(({ value }) => toOptionalNumber(value)) @IsNumber() @IsOptional() frameNewWall?: number | null;
    @IsString() @IsOptional() relocateWallQuantity?: string;
    @IsString() @IsOptional() dishwasherWiringQuantity?: string;
    @IsString() @IsOptional() hardwareInstallation?: string;
    @IsString() @IsOptional() sinkSelection?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() drywallSmoothCeilings?: boolean | null;
    @IsString() @IsOptional() drywallRemoveWallpaperQuantity?: string;

    // Electrodomésticos específicos por tamaño
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceFridge36?: boolean | null;
    @IsString() @IsOptional() applianceFridge36Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceFridge42?: boolean | null;
    @IsString() @IsOptional() applianceFridge42Quantity?: string;

    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceFreestandingRange30?: boolean | null;
    @IsString() @IsOptional() applianceFreestandingRange30Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceFreestandingRange36?: boolean | null;
    @IsString() @IsOptional() applianceFreestandingRange36Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() applianceFreestandingRange48?: boolean | null;
    @IsString() @IsOptional() applianceFreestandingRange48Quantity?: string;

    // Molduras específicas por medida
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimBaseboards35?: boolean | null;
    @IsString() @IsOptional() trimBaseboards35Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimBaseboards525?: boolean | null;
    @IsString() @IsOptional() trimBaseboards525Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimBaseboards725?: boolean | null;
    @IsString() @IsOptional() trimBaseboards725Quantity?: string;

    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimCrown4?: boolean | null;
    @IsString() @IsOptional() trimCrown4Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimCrown6?: boolean | null;
    @IsString() @IsOptional() trimCrown6Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimCrown8?: boolean | null;
    @IsString() @IsOptional() trimCrown8Quantity?: string;

    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimDoorCasing225?: boolean | null;
    @IsString() @IsOptional() trimDoorCasing225Quantity?: string;
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() trimDoorCasing35?: boolean | null;
    @IsString() @IsOptional() trimDoorCasing35Quantity?: string;

    // Cantidades de pintura adicionales
    @IsString() @IsOptional() paintPrimeCeilingWallsQuantity?: string;
    @IsString() @IsOptional() paintTrimCrownBaseCasingQuantity?: string;
    @IsString() @IsOptional() paintCeilingWallsQuantity?: string;

    // Flag para indicar múltiples planos/dibujos cargados
    @Transform(({ value }) => toBoolean(value)) @IsBoolean() @IsOptional() multipleDrawings?: boolean | null;
}