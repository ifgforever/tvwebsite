/**
 * D1 mapping.
 *
 * The design is written normalised — one row per dimensioned component with
 * real inch columns — and read back into the same `Project` shape the client
 * edits. A JSON snapshot goes to `revisions` on every save so nothing is ever
 * lost to a bad merge.
 */
import type { Design, DesignComponent, EstimateSettings, LightingZone, PhotoRef, Project, RenderingRef, Wall } from '../shared/types';
import { defaultEstimateSettings, defaultWall } from '../shared/defaults';
import { uid } from '../shared/id';
import type { Env } from './env';

const bool = (v: unknown) => (v ? 1 : 0);
const unbool = (v: unknown) => v === 1 || v === true;

export function rowToWall(r: Record<string, any> | null): Wall {
  if (!r) return defaultWall();
  return {
    roomWidthIn: r.room_width_in, ceilingHeightIn: r.ceiling_height_in,
    widthIn: r.width_in, heightIn: r.height_in, offsetXIn: r.offset_x_in,
    featureDepthIn: r.feature_depth_in, baseboardHeightIn: r.baseboard_in,
    baseboardKeep: unbool(r.baseboard_keep), colorHex: r.color_hex, accentColorHex: r.accent_color_hex,
    finish: r.finish, finishNotes: r.finish_notes, studSpacing: r.stud_spacing,
    lumber: r.lumber, customLumberDepthIn: r.custom_lumber_depth_in ?? undefined,
    doubleTopPlate: unbool(r.double_top_plate), midBlocking: unbool(r.mid_blocking), ptBottomPlate: unbool(r.pt_bottom_plate),
    drywallThickness: r.drywall_thickness, sideReturns: r.side_returns,
    wasteFactorPct: r.waste_factor_pct, loadBearing: r.load_bearing, existingWallNotes: r.existing_wall_notes,
  };
}

export function rowToComponent(r: Record<string, any>): DesignComponent {
  return {
    id: r.id, type: r.type, label: r.label,
    x: r.x_in, y: r.y_in, w: r.w_in, h: r.h_in, depthIn: r.depth_in,
    locked: unbool(r.locked), z: r.z, groupId: r.group_id,
    props: JSON.parse(r.props_json || '{}'),
  } as DesignComponent;
}

export function rowToProject(p: Record<string, any>, wall: Wall, components: DesignComponent[], lighting: LightingZone[], settings: EstimateSettings, photos: PhotoRef[], renderings: RenderingRef[]): Project {
  const design: Design = {
    schemaVersion: 1, wall, components, lighting,
    basePhotoId: p.base_photo_id, designNotes: p.design_notes || '',
    calibration: p.calibration_json ? JSON.parse(p.calibration_json) : null,
  };
  return {
    id: p.id, name: p.name, status: p.status,
    customer: {
      name: p.customer_name, address: p.customer_address, city: p.customer_city,
      state: p.customer_state, zip: p.customer_zip, phone: p.customer_phone, email: p.customer_email,
    },
    notes: p.notes, createdAt: p.created_at, updatedAt: p.updated_at,
    design, estimateSettings: settings, photos, renderings,
    approvedRevisionId: p.approved_revision_id, approvedAt: p.approved_at, tierOffered: p.tier_offered,
  };
}

export async function loadProject(env: Env, id: string): Promise<Project | null> {
  const p = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Record<string, any>>();
  if (!p) return null;

  const [wallRow, comps, zones, settingsRow, photoRows, renderRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM walls WHERE project_id = ?').bind(id).first<Record<string, any>>(),
    env.DB.prepare('SELECT * FROM components WHERE project_id = ? ORDER BY sort_order, id').bind(id).all<Record<string, any>>(),
    env.DB.prepare('SELECT * FROM lighting_zones WHERE project_id = ?').bind(id).all<Record<string, any>>(),
    env.DB.prepare('SELECT * FROM estimate_settings WHERE project_id = ?').bind(id).first<Record<string, any>>(),
    env.DB.prepare('SELECT * FROM photos WHERE project_id = ? ORDER BY created_at').bind(id).all<Record<string, any>>(),
    env.DB.prepare('SELECT * FROM renderings WHERE project_id = ? ORDER BY created_at DESC').bind(id).all<Record<string, any>>(),
  ]);

  const lighting: LightingZone[] = (zones.results || []).map((z) => ({
    id: z.id, label: z.label, kind: z.kind, colorMode: z.color_mode, colorHex: z.color_hex,
    targets: JSON.parse(z.targets_json || '[]'), lengthFt: z.length_ft, controller: z.controller,
    driverWatts: z.driver_watts, notes: z.notes,
  }));

  const photos: PhotoRef[] = (photoRows.results || []).map((ph) => ({
    id: ph.id, kind: ph.kind, url: `/api/photos/${ph.id}`, width: ph.width, height: ph.height,
    caption: ph.caption, createdAt: ph.created_at,
    transform: ph.transform_json ? JSON.parse(ph.transform_json) : null,
  }));

  const renderings: RenderingRef[] = (renderRows.results || []).map((r) => ({
    id: r.id, variant: r.variant, status: r.status, provider: r.provider, prompt: r.prompt,
    url: r.photo_id ? `/api/photos/${r.photo_id}` : null, revisionId: r.revision_id,
    error: r.error, createdAt: r.created_at,
  }));

  const settings: EstimateSettings = settingsRow?.settings_json
    ? { ...defaultEstimateSettings(), ...JSON.parse(settingsRow.settings_json) }
    : defaultEstimateSettings();

  return rowToProject(p, rowToWall(wallRow ?? null), (comps.results || []).map(rowToComponent), lighting, settings, photos, renderings);
}

export async function listProjects(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.name, p.status, p.customer_name, p.customer_address, p.customer_city,
            p.customer_phone, p.created_at, p.updated_at, p.base_photo_id,
            w.width_in, w.height_in,
            (SELECT COUNT(*) FROM components c WHERE c.project_id = p.id AND c.type = 'niche') AS niche_count,
            (SELECT COUNT(*) FROM photos ph WHERE ph.project_id = p.id) AS photo_count
       FROM projects p LEFT JOIN walls w ON w.project_id = p.id
      ORDER BY p.updated_at DESC LIMIT 500`,
  ).all<Record<string, any>>();
  return (results || []).map((r) => ({
    id: r.id, name: r.name, status: r.status,
    customerName: r.customer_name, address: [r.customer_address, r.customer_city].filter(Boolean).join(', '),
    phone: r.customer_phone, createdAt: r.created_at, updatedAt: r.updated_at,
    widthIn: r.width_in, heightIn: r.height_in, nicheCount: r.niche_count, photoCount: r.photo_count,
    thumbUrl: r.base_photo_id ? `/api/photos/${r.base_photo_id}` : null,
  }));
}

/** Full replace of a project, in one batch so a half-written design can't exist. */
export async function saveProject(env: Env, project: Project, note = ''): Promise<{ revisionId: string }> {
  const now = new Date().toISOString();
  const d = project.design;
  const w = d.wall;
  const revisionId = uid('rev');

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO projects (id, name, status, customer_name, customer_address, customer_city, customer_state,
        customer_zip, customer_phone, customer_email, notes, tier_offered, approved_revision_id, approved_at,
        base_photo_id, design_notes, calibration_json, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)
       ON CONFLICT(id) DO UPDATE SET name=?2, status=?3, customer_name=?4, customer_address=?5, customer_city=?6,
        customer_state=?7, customer_zip=?8, customer_phone=?9, customer_email=?10, notes=?11, tier_offered=?12,
        approved_revision_id=?13, approved_at=?14, base_photo_id=?15, design_notes=?16, calibration_json=?17, updated_at=?19`,
    ).bind(
      project.id, project.name, project.status, project.customer.name, project.customer.address,
      project.customer.city, project.customer.state, project.customer.zip, project.customer.phone,
      project.customer.email, project.notes, project.tierOffered ?? null, project.approvedRevisionId ?? null,
      project.approvedAt ?? null, d.basePhotoId, d.designNotes, d.calibration ? JSON.stringify(d.calibration) : null,
      project.createdAt || now, now,
    ),
    env.DB.prepare(
      `INSERT INTO walls (project_id, room_width_in, ceiling_height_in, width_in, height_in, offset_x_in,
        feature_depth_in, baseboard_in, baseboard_keep, color_hex, accent_color_hex, finish, finish_notes,
        stud_spacing, lumber, custom_lumber_depth_in, double_top_plate, mid_blocking, pt_bottom_plate,
        drywall_thickness, side_returns, waste_factor_pct, load_bearing, existing_wall_notes)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24)
       ON CONFLICT(project_id) DO UPDATE SET room_width_in=?2, ceiling_height_in=?3, width_in=?4, height_in=?5,
        offset_x_in=?6, feature_depth_in=?7, baseboard_in=?8, baseboard_keep=?9, color_hex=?10, accent_color_hex=?11,
        finish=?12, finish_notes=?13, stud_spacing=?14, lumber=?15, custom_lumber_depth_in=?16, double_top_plate=?17,
        mid_blocking=?18, pt_bottom_plate=?19, drywall_thickness=?20, side_returns=?21, waste_factor_pct=?22,
        load_bearing=?23, existing_wall_notes=?24`,
    ).bind(
      project.id, w.roomWidthIn, w.ceilingHeightIn, w.widthIn, w.heightIn, w.offsetXIn, w.featureDepthIn,
      w.baseboardHeightIn, bool(w.baseboardKeep), w.colorHex, w.accentColorHex, w.finish, w.finishNotes,
      w.studSpacing, w.lumber, w.customLumberDepthIn ?? null, bool(w.doubleTopPlate), bool(w.midBlocking),
      bool(w.ptBottomPlate), w.drywallThickness, w.sideReturns, w.wasteFactorPct, w.loadBearing, w.existingWallNotes,
    ),
    env.DB.prepare('DELETE FROM components WHERE project_id = ?').bind(project.id),
    env.DB.prepare('DELETE FROM lighting_zones WHERE project_id = ?').bind(project.id),
  ];

  d.components.forEach((c, i) => {
    statements.push(
      env.DB.prepare(
        `INSERT INTO components (id, project_id, type, label, x_in, y_in, w_in, h_in, depth_in, locked, z, group_id, sort_order, props_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`,
      ).bind(c.id, project.id, c.type, c.label, c.x, c.y, c.w, c.h, c.depthIn, bool(c.locked), c.z, c.groupId ?? null, i, JSON.stringify((c as any).props ?? {})),
    );
  });

  for (const z of d.lighting) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO lighting_zones (id, project_id, label, kind, color_mode, color_hex, targets_json, length_ft, controller, driver_watts, notes)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
      ).bind(z.id, project.id, z.label, z.kind, z.colorMode, z.colorHex, JSON.stringify(z.targets), z.lengthFt, z.controller, z.driverWatts, z.notes),
    );
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO estimate_settings (project_id, settings_json, updated_at) VALUES (?1,?2,?3)
       ON CONFLICT(project_id) DO UPDATE SET settings_json=?2, updated_at=?3`,
    ).bind(project.id, JSON.stringify(project.estimateSettings), now),
    env.DB.prepare('INSERT INTO revisions (id, project_id, snapshot_json, note, created_at) VALUES (?1,?2,?3,?4,?5)')
      .bind(revisionId, project.id, JSON.stringify({ design: d, estimateSettings: project.estimateSettings }), note, now),
    // Keep the last 40 revisions per project.
    env.DB.prepare(
      `DELETE FROM revisions WHERE project_id = ?1 AND id NOT IN
        (SELECT id FROM revisions WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 40)`,
    ).bind(project.id),
  );

  await env.DB.batch(statements);
  return { revisionId };
}

export async function deleteProject(env: Env, id: string) {
  const photos = await env.DB.prepare('SELECT id, storage, storage_key FROM photos WHERE project_id = ?').bind(id).all<Record<string, any>>();
  if (env.PHOTOS) {
    for (const p of photos.results || []) if (p.storage === 'r2' && p.storage_key) await env.PHOTOS.delete(p.storage_key);
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM photo_blobs WHERE photo_id IN (SELECT id FROM photos WHERE project_id = ?)').bind(id),
    env.DB.prepare('DELETE FROM photos WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM renderings WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM revisions WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM components WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM lighting_zones WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM estimate_settings WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM walls WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM sourcing_overrides WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id),
  ]);
}
