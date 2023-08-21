import { Schema, model } from 'mongoose';
import { MODELS } from '../constants/model.constants';

export const sharedBuyerPropertyInfo: Schema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.TENANT,
    },
    viewedAt: {
      type: Schema.Types.Date,
      default: null,
    },
    isShortlisted: {
      type: Schema.Types.Boolean,
      default: false,
    },
    shortListedAt: {
      type: Schema.Types.Date,
      default: null,
    },
    sharedAt: {
      type: Schema.Types.Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default model(MODELS.SHAREDPBUYERPROPERTY, sharedBuyerPropertyInfo);
