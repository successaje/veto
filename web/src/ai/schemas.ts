// JSON Schemas shared by on-device (Prompt API responseConstraint) and cloud
// (generationConfig.responseJsonSchema). Kept deliberately simple so the same shapes work with
// Android @Generable and Apple @Generable: no nullable unions; -1 means "unknown/none".

import { ATTRS } from '../attrs';

const str = (maxLength = 80) => ({ type: 'string', maxLength });
const enumArr = (values: readonly string[], maxItems = 8) => ({
  type: 'array',
  items: { type: 'string', enum: [...values] },
  maxItems,
});

export const specSchema = {
  type: 'object',
  properties: {
    title: str(60),
    area: str(60),
    when: str(60),
    groupSize: { type: 'integer', minimum: 2, maximum: 20 },
    vibe: str(80),
  },
  required: ['title', 'area', 'when', 'groupSize', 'vibe'],
};

export const candidatesSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          name: str(60),
          area: str(60),
          priceBand: { type: 'integer', minimum: 1, maximum: 4 },
          estPerPerson: { type: 'integer', description: 'Typical USD per person; -1 if unknown' },
          travelMin: { type: 'integer', description: 'Minutes from the area centre; -1 if unknown' },
          stepFree: { type: 'string', enum: ATTRS.stepFree },
          noise: { type: 'string', enum: ATTRS.noise },
          alcoholFocus: { type: 'string', enum: ATTRS.alcoholFocus },
          servesHeavily: enumArr(ATTRS.foods, 4),
          dietTags: enumArr(ATTRS.dietTags, 6),
          venueTypes: enumArr(ATTRS.venueTypes, 4),
          evidence: str(240),
        },
        required: [
          'name', 'area', 'priceBand', 'estPerPerson', 'travelMin', 'stepFree', 'noise',
          'alcoholFocus', 'servesHeavily', 'dietTags', 'venueTypes', 'evidence',
        ],
      },
    },
  },
  required: ['items'],
};

export const profileSchema = {
  type: 'object',
  properties: {
    hard: {
      type: 'object',
      properties: {
        avoidFoods: enumArr(ATTRS.foods),
        avoidVenueTypes: enumArr(ATTRS.venueTypes),
        needsStepFree: { type: 'boolean' },
        stepFreeUnknown: { type: 'string', enum: ['veto', 'confirm'] },
        maxPerPerson: { type: 'integer', description: 'USD per person, or -1 for no limit' },
        maxTravelMin: { type: 'integer', description: 'Minutes, or -1 for no limit' },
        avoidAlcoholFocus: { type: 'boolean' },
        needsQuiet: { type: 'boolean' },
        requireDietTags: enumArr(ATTRS.dietTags),
        avoidNames: { type: 'array', items: str(60), maxItems: 5 },
      },
      required: [
        'avoidFoods', 'avoidVenueTypes', 'needsStepFree', 'stepFreeUnknown', 'maxPerPerson',
        'maxTravelMin', 'avoidAlcoholFocus', 'needsQuiet', 'requireDietTags', 'avoidNames',
      ],
    },
    soft: {
      type: 'object',
      properties: {
        likes: { type: 'array', items: str(40), maxItems: 5 },
        dislikes: { type: 'array', items: str(40), maxItems: 5 },
      },
      required: ['likes', 'dislikes'],
    },
    other: str(120),
  },
  required: ['hard', 'soft', 'other'],
};

export const fitSchema = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          i: { type: 'integer', minimum: 0, maximum: 9 },
          s: { type: 'integer', minimum: 0, maximum: 3 },
        },
        required: ['i', 's'],
      },
    },
  },
  required: ['scores'],
};
