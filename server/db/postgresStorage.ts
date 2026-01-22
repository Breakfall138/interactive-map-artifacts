import { pool } from "./config";
import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
  ViewportResponse,
  Layer,
} from "@shared/schema";
import type { IStorage } from "../storage";

interface ClusterData {
  id: string;
  lat: number;
  lng: number;
  count: number;
}

export class PostgresStorage implements IStorage {
  async getAllArtifacts(layers?: string[]): Promise<Artifact[]> {
    const layerClause = layers?.length ? "WHERE layer = ANY($1::text[])" : "";
    const params = layers?.length ? [layers] : [];

    const result = await pool.query(
      `
      SELECT id, name, category, layer, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      ${layerClause}
      ORDER BY created_at DESC
      LIMIT 10000
    `,
      params
    );
    return result.rows.map(this.mapRowToArtifact);
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const result = await pool.query(
      `
      SELECT id, name, category, layer, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      WHERE id = $1
    `,
      [id]
    );

    return result.rows[0] ? this.mapRowToArtifact(result.rows[0]) : undefined;
  }

  async getArtifactsInBounds(bounds: Bounds, layers?: string[]): Promise<Artifact[]> {
    const layerClause = layers?.length ? "AND layer = ANY($5::text[])" : "";
    const params: (number | string[])[] = [bounds.west, bounds.south, bounds.east, bounds.north];
    if (layers?.length) params.push(layers);

    const result = await pool.query(
      `
      SELECT id, name, category, layer, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      WHERE ST_Intersects(
        location,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
      )
      ${layerClause}
      LIMIT 10000
    `,
      params
    );

    return result.rows.map(this.mapRowToArtifact);
  }

  async getArtifactsInCircle(circle: CircleSelection, layers?: string[]): Promise<Artifact[]> {
    const layerClause = layers?.length ? "AND layer = ANY($4::text[])" : "";
    const params: (number | string[])[] = [circle.center.lng, circle.center.lat, circle.radius];
    if (layers?.length) params.push(layers);

    const result = await pool.query(
      `
      SELECT id, name, category, layer, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ${layerClause}
    `,
      params
    );

    return result.rows.map(this.mapRowToArtifact);
  }

  async getAggregation(circle: CircleSelection, layers?: string[]): Promise<AggregationResult> {
    const layerClause = layers?.length ? "AND layer = ANY($4::text[])" : "";
    const params: (number | string[])[] = [circle.center.lng, circle.center.lat, circle.radius];
    if (layers?.length) params.push(layers);

    const result = await pool.query(
      `
      WITH circle_artifacts AS (
        SELECT id, name, category, layer, description, metadata, lat, lng,
               created_at as "createdAt"
        FROM artifacts
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ${layerClause}
      ),
      category_counts AS (
        SELECT category, COUNT(*)::integer as count
        FROM circle_artifacts
        GROUP BY category
      )
      SELECT
        (SELECT COUNT(*)::integer FROM circle_artifacts) as total_count,
        (SELECT json_object_agg(category, count) FROM category_counts) as categories,
        (SELECT json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'category', category,
            'layer', layer,
            'description', description,
            'metadata', metadata,
            'lat', lat,
            'lng', lng,
            'createdAt', "createdAt"
          )
        ) FROM circle_artifacts) as artifacts
    `,
      params
    );

    const row = result.rows[0];
    return {
      count: row.total_count || 0,
      categories: row.categories || {},
      artifacts: row.artifacts || [],
    };
  }

  async getViewportData(
    bounds: Bounds,
    zoom: number,
    limit: number,
    layers?: string[]
  ): Promise<ViewportResponse> {
    const layerClause = layers?.length ? "AND layer = ANY($6::text[])" : "";

    // At high zoom levels (>= 13), return individual artifacts
    if (zoom >= 13) {
      const params: (number | string[])[] = [
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.north,
        limit + 1,
      ];
      if (layers?.length) params.push(layers);

      const result = await pool.query(
        `
        SELECT id, name, category, layer, description, metadata, lat, lng,
               created_at as "createdAt"
        FROM artifacts
        WHERE ST_Intersects(
          location,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
        )
        ${layerClause}
        LIMIT $5
      `,
        params
      );

      const truncated = result.rows.length > limit;
      const singles = result.rows.slice(0, limit).map(this.mapRowToArtifact);

      return {
        clusters: [],
        singles,
        total: result.rows.length,
        truncated,
      };
    }

    // At lower zoom levels, perform grid-based clustering
    const gridSize = this.getClusterGridSize(zoom);
    const params: (number | string[])[] = [
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north,
      gridSize,
    ];
    if (layers?.length) params.push(layers);

    const result = await pool.query(
      `
      WITH viewport_artifacts AS (
        SELECT id, name, category, layer, description, metadata, lat, lng,
               created_at as "createdAt",
               floor(lng / $5) as cell_x,
               floor(lat / $5) as cell_y
        FROM artifacts
        WHERE ST_Intersects(
          location,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
        )
        ${layerClause}
      ),
      grid_cells AS (
        SELECT
          cell_x,
          cell_y,
          COUNT(*)::integer as point_count,
          AVG(lat) as center_lat,
          AVG(lng) as center_lng,
          json_agg(
            json_build_object(
              'id', id,
              'name', name,
              'category', category,
              'layer', layer,
              'description', description,
              'metadata', metadata,
              'lat', lat,
              'lng', lng,
              'createdAt', "createdAt"
            )
          ) as artifacts
        FROM viewport_artifacts
        GROUP BY cell_x, cell_y
      )
      SELECT
        cell_x,
        cell_y,
        point_count,
        center_lat,
        center_lng,
        CASE WHEN point_count <= 3 THEN artifacts ELSE NULL END as artifacts
      FROM grid_cells
    `,
      params
    );

    const clusters: ClusterData[] = [];
    const singles: Artifact[] = [];
    let total = 0;

    for (const row of result.rows) {
      total += row.point_count;

      if (row.point_count > 3) {
        clusters.push({
          id: `cluster-${row.cell_x}:${row.cell_y}`,
          lat: parseFloat(row.center_lat),
          lng: parseFloat(row.center_lng),
          count: row.point_count,
        });
      } else if (row.artifacts) {
        singles.push(...row.artifacts);
      }
    }

    const combinedCount = clusters.length + singles.length;
    const truncated = combinedCount > limit;

    if (truncated) {
      if (clusters.length <= limit) {
        const remainingLimit = limit - clusters.length;
        return {
          clusters,
          singles: singles.slice(0, remainingLimit),
          total,
          truncated: true,
        };
      }
      return {
        clusters: clusters.slice(0, limit),
        singles: [],
        total,
        truncated: true,
      };
    }

    return { clusters, singles, total, truncated: false };
  }

  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const result = await pool.query(
      `
      INSERT INTO artifacts (name, category, layer, description, metadata, location)
      VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
      RETURNING id, name, category, layer, description, metadata, lat, lng,
                created_at as "createdAt"
    `,
      [
        artifact.name,
        artifact.category,
        artifact.layer || "default",
        artifact.description || null,
        JSON.stringify(artifact.metadata || {}),
        artifact.lng,
        artifact.lat,
      ]
    );

    return this.mapRowToArtifact(result.rows[0]);
  }

  async createManyArtifacts(artifacts: InsertArtifact[]): Promise<Artifact[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const results: Artifact[] = [];
      for (const artifact of artifacts) {
        const result = await client.query(
          `
          INSERT INTO artifacts (name, category, layer, description, metadata, location)
          VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
          RETURNING id, name, category, layer, description, metadata, lat, lng,
                    created_at as "createdAt"
        `,
          [
            artifact.name,
            artifact.category,
            artifact.layer || "default",
            artifact.description || null,
            JSON.stringify(artifact.metadata || {}),
            artifact.lng,
            artifact.lat,
          ]
        );
        results.push(this.mapRowToArtifact(result.rows[0]));
      }

      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getArtifactCount(layers?: string[]): Promise<number> {
    const layerClause = layers?.length ? "WHERE layer = ANY($1::text[])" : "";
    const params = layers?.length ? [layers] : [];

    const result = await pool.query(
      `SELECT COUNT(*)::integer as count FROM artifacts ${layerClause}`,
      params
    );
    return result.rows[0].count;
  }

  // Layer management methods
  async getLayers(): Promise<Layer[]> {
    const result = await pool.query(`
      SELECT id, name, description, source, source_date as "sourceDate",
             artifact_count as "artifactCount", visible, style
      FROM layers
      ORDER BY name
    `);
    return result.rows.map(this.mapRowToLayer);
  }

  async getLayer(id: string): Promise<Layer | undefined> {
    const result = await pool.query(
      `
      SELECT id, name, description, source, source_date as "sourceDate",
             artifact_count as "artifactCount", visible, style
      FROM layers
      WHERE id = $1
    `,
      [id]
    );
    return result.rows[0] ? this.mapRowToLayer(result.rows[0]) : undefined;
  }

  async createLayer(layer: Omit<Layer, "artifactCount">): Promise<Layer> {
    const result = await pool.query(
      `
      INSERT INTO layers (id, name, description, source, visible, style)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        source = EXCLUDED.source,
        visible = EXCLUDED.visible,
        style = EXCLUDED.style,
        updated_at = NOW()
      RETURNING id, name, description, source, source_date as "sourceDate",
                artifact_count as "artifactCount", visible, style
    `,
      [
        layer.id,
        layer.name,
        layer.description || null,
        layer.source || null,
        layer.visible ?? true,
        JSON.stringify(layer.style || {}),
      ]
    );
    return this.mapRowToLayer(result.rows[0]);
  }

  async updateLayerVisibility(id: string, visible: boolean): Promise<void> {
    await pool.query(
      `UPDATE layers SET visible = $2, updated_at = NOW() WHERE id = $1`,
      [id, visible]
    );
  }

  async deleteLayer(id: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM artifacts WHERE layer = $1", [id]);
      await client.query("DELETE FROM layers WHERE id = $1", [id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private getClusterGridSize(zoom: number): number {
    if (zoom <= 6) return 2;
    if (zoom <= 8) return 1;
    if (zoom <= 10) return 0.5;
    if (zoom <= 12) return 0.1;
    return 0.05;
  }

  private mapRowToArtifact(row: Record<string, unknown>): Artifact {
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      layer: (row.layer as string) || "default",
      description: (row.description as string) || undefined,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : (row.metadata as Record<string, unknown>),
      lat: parseFloat(row.lat as string),
      lng: parseFloat(row.lng as string),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : (row.createdAt as string) || new Date().toISOString(),
    };
  }

  private mapRowToLayer(row: Record<string, unknown>): Layer {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || undefined,
      source: (row.source as string) || undefined,
      sourceDate: (row.sourceDate as string) || undefined,
      artifactCount: (row.artifactCount as number) || 0,
      visible: row.visible as boolean,
      style:
        typeof row.style === "string"
          ? JSON.parse(row.style)
          : (row.style as Record<string, unknown>) || undefined,
    };
  }
}
