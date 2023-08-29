const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class LikesService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addLikeAlbum({
    userId, albumId,
  }) {
    const queryCheck = {
      text: `
        SELECT *
        FROM albums
        WHERE albums.id = $1
      `,
      values: [albumId],
    };
    const checkResult = await this._pool.query(queryCheck);
    if (!checkResult.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const queryCheckLiked = {
      text: `
        SELECT *
        FROM likes
        WHERE likes.user_id = $1 AND likes.album_id = $2
      `,
      values: [userId, albumId],
    };
    const likedAlbum = await this._pool.query(queryCheckLiked);
    if (likedAlbum.rows.length) {
      throw new InvariantError('Album telah disukai');
    }

    const id = `Likes-${userId}-${nanoid(16)}`;
    const likedAt = new Date().toISOString();

    const query = {
      text: 'INSERT INTO likes VALUES($1, $2, $3, $4 ) RETURNING id',
      values: [id, userId, albumId, likedAt],
    };
    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      await this._cacheService.delete(`likes:${albumId}`);
      throw new InvariantError('Gagal menyukai album');
    }

    return result.rows[0].id;
  }

  async getAlbumsLike(id) {
    const data = {
      likes: null,
      source: 'cache',
    };

    try {
      const result = await this._cacheService.get(`likes:${id}`);
      data.source = 'cache';
      data.likes = JSON.parse(result);
    } catch (error) {
      const query = {
        text: `
            SELECT
              COUNT(likes.id) AS likes
            FROM
              albums
            LEFT JOIN
              likes
            ON
              albums.id = likes.album_id
            WHERE albums.id = $1
          `,
        values: [id],
      };
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError('Tidak terdapat likes');
      }
      // eslint-disable-next-line radix
      data.likes = parseInt(result.rows[0].likes);
      data.source = 'database';
      await this._cacheService.set(`likes:${id}`, JSON.stringify(data.likes));
    }

    return data;
  }

  async unlikeAlbum(userId, albumId) {
    const query = {
      text: `DELETE FROM likes
      WHERE user_id = $1 AND album_id = $2 RETURNING id`,
      values: [userId, albumId],
    };
    await this._cacheService.delete(`likes:${albumId}`);
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Proses unlike gagal. Anda belum menyukai album');
    }
  }
}

module.exports = LikesService;
