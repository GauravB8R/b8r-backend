import Joi from '@hapi/joi';
import { failureResponse } from '../helpers/api-response.helper';
import { staticStatus } from '../constants/global.constants';

// add/edit board schema validation
export const boardValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    tenantId: Joi.string().when(Joi.ref('$buyerId'), {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    buyerId: Joi.string().when(Joi.ref('$tenantId'), {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    propertyId: Joi.array().items(Joi.string()).optional(),
    status: Joi.string()
      .valid(...Object.keys(staticStatus))
      .optional(),
    key: Joi.string().optional(),
    boardFor: Joi.string().optional()
  });
  const value = schema.validate(req.body);
  if (value.error) {
    return failureResponse(
      res,
      400,
      value.error,
      value.error.details[0].message
        ? value.error.details[0].message
        : 'Bad request'
    );
  } else {
    next();
  }
};

// add property board schema validation
export const addProeprtyInboardValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
   propertyId: Joi.string().required(),
  });
  const value = schema.validate(req.body);
  if (value.error) {
    return failureResponse(
      res,
      400,
      value.error,
      value.error.details[0].message
        ? value.error.details[0].message
        : 'Bad request'
    );
  } else {
    next();
  }
};
