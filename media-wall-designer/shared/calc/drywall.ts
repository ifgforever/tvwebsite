/** Drywall take-off: face, every return, sheets, bead, tape, mud, screws. */
import type { Design, FireplaceComponent, NicheComponent } from '../types';
import { computeOpenings } from './framing';
import { sqIn2SqFt } from '../units';

export interface DrywallResult {
  faceSqFt: number;
  nicheReturnSqFt: number;
  fireplaceReturnSqFt: number;
  sideReturnSqFt: number;
  topReturnSqFt: number;
  totalSqFt: number;
  grossFaceSqFt: number;
  fieldSheets: number;
  returnSheets: number;
  thickness: number;
  sheets: number;
  sheetLabel: string;
  cornerBeadLf: number;
  beadSticks: number;
  tapeLf: number;
  tapeRolls: number;
  screwCount: number;
  screwLb: number;
  mudGal: number;
  mudBuckets: number;
  primerGal: number;
  breakdown: { label: string; sqft: number; note: string }[];
}

const SHEET_SQFT = 32; // 4' × 8'

export function calcDrywall(design: Design): DrywallResult {
  const { wall } = design;
  const openings = computeOpenings(design);
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const fireplaces = design.components.filter((c): c is FireplaceComponent => c.type === 'fireplace');

  const grossFace = wall.widthIn * wall.heightIn;
  const openArea = openings.reduce((s, o) => s + o.w * o.h, 0);
  const faceSqFt = sqIn2SqFt(grossFace - openArea);

  // Returns: the four inside faces of every recess.
  const nicheReturnSqFt = sqIn2SqFt(
    niches.reduce((s, n) => s + 2 * (n.w + n.h) * n.depthIn + n.w * n.h, 0), // sides + back
  );
  const fireplaceReturnSqFt = sqIn2SqFt(
    fireplaces.reduce((s, f) => s + 2 * (f.w + f.h) * Math.max(0, f.depthIn), 0),
  );

  const sideCount = wall.sideReturns === 'both' ? 2 : wall.sideReturns === 'none' ? 0 : 1;
  const sideReturnSqFt = sqIn2SqFt(sideCount * wall.featureDepthIn * wall.heightIn);
  const topReturnSqFt = wall.heightIn < wall.ceilingHeightIn - 0.25 ? sqIn2SqFt(wall.featureDepthIn * wall.widthIn) : 0;

  const totalSqFt = faceSqFt + nicheReturnSqFt + fireplaceReturnSqFt + sideReturnSqFt + topReturnSqFt;
  const waste = 1 + wall.wasteFactorPct / 100;
  // Sheets are counted off the GROSS wall — you hang over the openings and cut
  // them out — and the returns are counted separately because small pieces
  // waste far more board than flat field does.
  const grossFaceSqFt = sqIn2SqFt(grossFace);
  const returnSqFt = nicheReturnSqFt + fireplaceReturnSqFt + sideReturnSqFt + topReturnSqFt;
  const fieldSheets = Math.ceil((grossFaceSqFt * waste) / SHEET_SQFT);
  const returnSheets = returnSqFt > 0 ? Math.ceil((returnSqFt * (waste + 0.5)) / SHEET_SQFT) : 0;
  const sheets = fieldSheets + returnSheets;

  // Outside corners: every niche opening, plus the exposed vertical edges.
  const nicheBeadLf = niches.reduce((s, n) => s + 2 * (n.w + n.h), 0) / 12;
  const sideBeadLf = (sideCount * wall.heightIn + (topReturnSqFt > 0 ? wall.widthIn : 0)) / 12;
  const fireplaceBeadLf = fireplaces.reduce((s, f) => s + 2 * (f.w + f.h), 0) / 12;
  const cornerBeadLf = Math.round(nicheBeadLf + sideBeadLf + fireplaceBeadLf);

  // Inside corners (taped): niche back corners, plus field seams.
  const nicheInsideLf = niches.reduce((s, n) => s + 2 * (n.w + n.h), 0) / 12;
  const fieldSeamLf = sheets * 8;
  const tapeLf = Math.round(fieldSeamLf + nicheInsideLf + (wall.heightIn * (sideCount + 1)) / 12);

  const screwCount = Math.ceil(sheets * 32 + niches.length * 24);
  const mudGal = totalSqFt / 105 + niches.length * 0.35 + fireplaces.length * 0.3;
  const primerGal = totalSqFt / 350;

  return {
    faceSqFt: r1(faceSqFt),
    nicheReturnSqFt: r1(nicheReturnSqFt),
    fireplaceReturnSqFt: r1(fireplaceReturnSqFt),
    sideReturnSqFt: r1(sideReturnSqFt),
    topReturnSqFt: r1(topReturnSqFt),
    totalSqFt: r1(totalSqFt),
    grossFaceSqFt: r1(grossFaceSqFt),
    fieldSheets,
    returnSheets,
    thickness: wall.drywallThickness,
    sheets,
    sheetLabel: wall.drywallThickness === 0.5 ? '1/2"' : '5/8" Type X',
    cornerBeadLf,
    beadSticks: Math.ceil(cornerBeadLf / 8),
    tapeLf,
    tapeRolls: Math.ceil(tapeLf / 250),
    screwCount,
    screwLb: Math.ceil((screwCount / 320) * 10) / 10,
    mudGal: r1(mudGal),
    mudBuckets: Math.ceil(mudGal / 4.5),
    primerGal: Math.ceil(primerGal * 10) / 10,
    breakdown: [
      { label: 'Wall face', sqft: r1(faceSqFt), note: `Gross ${r1(grossFaceSqFt)} sf less every opening — hung as ${fieldSheets} full sheets` },
      { label: 'Niche returns', sqft: r1(nicheReturnSqFt), note: `${niches.length} niches — sides, head, sill and back` },
      { label: 'Fireplace returns', sqft: r1(fireplaceReturnSqFt), note: fireplaces.length ? 'Verify against the fireplace manual' : 'None' },
      { label: 'Side returns', sqft: r1(sideReturnSqFt), note: `${sideCount} exposed edge${sideCount === 1 ? '' : 's'} × ${wall.featureDepthIn}" deep` },
      { label: 'Top return', sqft: r1(topReturnSqFt), note: topReturnSqFt ? 'Wall stops below the ceiling' : 'Wall runs to the ceiling' },
    ],
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
