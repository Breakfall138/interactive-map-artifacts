import { pool } from "./config";
import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
  ViewportResponse,
} from "@shared/schema";
import type { IStorage } from "../storage";

interface ClusterData {
  id: string;
  lat: number;
  lng: number;
  count: number;
}

export class PostgresStorage implements IStorage {
  async getAllArtifacts(): Promise<Artifact[]> {
    const result = await pool.query(`
      SELECT id, name, category, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      ORDER BY created_at DESC
      LIMIT 10000
    `);
    return result.rows.map(this.mapRowToArtifact);
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const result = await pool.query(
      `
      SELECT id, name, category, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      WHERE id = $1
    `,
      [id]
    );

    return result.rows[0] ? this.mapRowToArtifact(result.rows[0]) : undefined;
  }

  async getArtifactsInBounds(bounds: Bounds): Promise<Artifact[]> {
    const result = await pool.query(
      `
      SELECT id, name, category, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      WHERE ST_Intersects(
        location,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
      )
      LIMIT 10000
    `,
      [bounds.west, bounds.south, bounds.east, bounds.north]
    );

    return result.rows.map(this.mapRowToArtifact);
  }

  async getArtifactsInCircle(circle: CircleSelection): Promise<Artifact[]> {
    const result = await pool.query(
      `
      SELECT id, name, category, description, metadata, lat, lng,
             created_at as "createdAt"
      FROM artifacts
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    `,
      [circle.center.lng, circle.center.lat, circle.radius]
    );

    return result.rows.map(this.mapRowToArtifact);
  }

  async getAggregation(circle: CircleSelection): Promise<AggregationResult> {
    const result = await pool.query(
      `
      WITH circle_artifacts AS (
        SELECT id, name, category, description, metadata, lat, lng,
               created_at as "createdAt"
        FROM artifacts
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
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
            'description', description,
            'metadata', metadata,
            'lat', lat,
            'lng', lng,
            'createdAt', "createdAt"
          )
        ) FROM circle_artifacts) as artifacts
    `,
      [circle.center.lng, circle.center.lat, circle.radius]
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
    limit: number
  ): Promise<ViewportResponse> {
    // At high zoom levels (>= 13), return individual artifacts
    if (zoom >= 13) {
      const result = await pool.query(
        `
        SELECT id, name, category, description, metadata, lat, lng,
               created_at as "createdAt"
        FROM artifacts
        WHERE ST_Intersects(
          location,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
        )
        LIMIT $5
      `,
        [bounds.west, bounds.south, bounds.east, bounds.north, limit + 1]
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

    const result = await pool.query(
      `
      WITH viewport_artifacts AS (
        SELECT id, name, category, description, metadata, lat, lng,
               created_at as "createdAt",
               floor(lng / $5) as cell_x,
               floor(lat / $5) as cell_y
        FROM artifacts
        WHERE ST_Intersects(
          location,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
        )
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
      [bounds.west, bounds.south, bounds.east, bounds.north, gridSize]
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
      INSERT INTO artifacts (name, category, description, metadata, location)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)
      RETURNING id, name, category, description, metadata, lat, lng,
                created_at as "createdAt"
    `,
      [
        artifact.name,
        artifact.category,
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
          INSERT INTO artifacts (name, category, description, metadata, location)
          VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)
          RETURNING id, name, category, description, metadata, lat, lng,
                    created_at as "createdAt"
        `,
          [
            artifact.name,
            artifact.category,
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

  async getArtifactCount(): Promise<number> {
    const result = await pool.query("SELECT COUNT(*)::integer as count FROM artifacts");
    return result.rows[0].count;
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
}
