const Joi = require('joi');

const ActivitiesPayloadSchema = Joi.object({
  playlistId: Joi.string().required(),
  userId: Joi.string().required(),
  songId: Joi.string().required(),
});

module.exports = { ActivitiesPayloadSchema };
