import { Request, Response } from 'express';
import {
  successResponse,
  failureResponse,
} from '../helpers/api-response.helper';
import Board from '../models/board.model';
import Property from '../models/property.model';
import SharedProperty from '../models/common.model';
import { Types } from 'mongoose';
import { generateRandomKey } from '../services/crypto.service';
import { copyAndRenameS3Images, getS3Images } from './uploadImage.controller';

// Add new board
export const addBoard = async (req: Request, res: Response) => {
  try {
    const tempData = req.body;
    tempData.propertyAgentId = new Types.ObjectId(req.user.user._id);
    tempData.key = await generateRandomKey(12);
    const detailObj: any = new Board(tempData);
    const savedRecord: any = await detailObj.save();
    await savedRecord.populate('propertyId');
    await savedRecord.populate('tenantId');
    return successResponse(
      res,
      200,
      { board: savedRecord },
      'New board created successfully.'
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

// Add property in board by property agent
export const addPropertyInBoard = async (req: Request, res: Response) => {
  const board = await Board.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { propertyId: req.body.propertyId } },
    { new: true }
  );
  if (!board) {
    return failureResponse(res, 404, [], 'Board not found.');
  }
  return successResponse(
    res,
    200,
    { board },
    'Property added to board successfully.'
  );
};

// Update viewedAt Date while view property
export const updatePropertyViewAtDate = async (req: Request, res: Response) => {
  try {
    console.log('req.pparams', req.params, req.user, req.body);
    const propertyId = req.body.propertyId;
    const tenantId = req.user.user._id;
    const board = await Board.findById(req.params.id)
      .populate('tenantId propertyId')
      .lean();
    if (!board) {
      return failureResponse(res, 404, [], 'Board not found.');
    }
    const update = updateViewedAtDate(board, propertyId, tenantId);
    console.log('updated record', update);
    return successResponse(
      res,
      200,
      { board },
      'Property viewed date added successfully.'
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

const updateViewedAtDate = async (data, propertyId, tenantId) => {
  try {
    if (data && data.propertyId && data.propertyId.length) {
      return await Promise.all(
        data.propertyId.map(async (singleProperty) => {
          if (
            singleProperty._id === propertyId &&
            singleProperty.sharedProperty &&
            singleProperty.sharedProperty.length
          ) {
            return await SharedProperty.updateMany(
              {
                tenantId,
                _id: { $in: singleProperty.sharedProperty },
              },
              { $set: { viewedAt: Date.now() } }
            );
          }
        })
      );
    }
  } catch (error) {
    return failureResponse(
      {},
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

// Finalize board by property agent
export const finalizeBoard = async (req: Request, res: Response) => {
  try {
    const board = await Board.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: true },
      },
      { new: true }
    )
      .populate('tenantId propertyId')
      .lean();
    if (!board) {
      return failureResponse(res, 404, [], 'Board not found.');
    }
    const update = updateSharedPropertyTable(board);
    // const update = updateSharedDate(board);
    return successResponse(res, 200, { board }, 'Board finalize successfully.');
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

const updateSharedPropertyTable = async (data) => {
  console.log('data while update', data);
  await Promise.all(
    data.propertyId.map(async (singleProperty) => {
      const obj = {
        tenantId: data.tenantId,
      };
      const detailObj: any = new SharedProperty(obj);
      const savedObj = await detailObj.save();
      Property.findByIdAndUpdate(
        singleProperty._id,
        { $push: { sharedProperty: savedObj._id } },
        { new: true }
      ).exec((err, updatedValue) => {
        if (err) {
          return failureResponse(err, 404, [], 'Board not found.');
        }
        return updatedValue;
      });
    })
  );
};

// Share board by property agent
export const shareBoard = async (req: Request, res: Response) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('tenantId propertyId')
      .lean();
    if (!board) {
      return failureResponse(res, 404, [], 'Board not found.');
    }
    const update = updateSharedDate(board);
    return successResponse(res, 200, { board }, 'Board finalize successfully.');
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

const updateSharedDate = async (data) => {
  try {
    if (data && data.propertyId && data.propertyId.length) {
      await Promise.all(
        data.propertyId.map(async (singleProperty) => {
          if (
            singleProperty.sharedProperty &&
            singleProperty.sharedProperty.length
          ) {
            return await SharedProperty.updateMany(
              {
                tenantId: data.tenantId._id,
                _id: { $in: singleProperty.sharedProperty },
              },
              { $set: { sharedAt: data.updatedAt } }
            );
          }
        })
      );
    }
  } catch (error) {
    return failureResponse(
      {},
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

// Add date while shortlist property
export const shortlistDate = async (req: Request, res: Response) => {
  try {
    const propertyId = req.body.propertyId;
    const tenantId = req.user.user._id;
    const board = await Board.findById(req.params.id)
      .populate('tenantId propertyId')
      .lean();
    if (!board) {
      return failureResponse(res, 404, [], 'Board not found.');
    }
    const update = updateShortlistDate(board, propertyId, tenantId);
    console.log('updated shortlisted', update);
    return successResponse(
      res,
      200,
      { board },
      'Property shortlisted successfully.'
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};
const updateShortlistDate = async (data, propertyId, tenantId) => {
  try {
    // console.log('data', data, propertyId, tenantId);
    return await Promise.all(
      data.propertyId.map(async (singleProperty) => {
        if (
          singleProperty._id == propertyId &&
          singleProperty.sharedProperty &&
          singleProperty.sharedProperty.length
        ) {
          return await SharedProperty.updateMany(
            {
              tenantId,
              _id: { $in: singleProperty.sharedProperty },
            },
            { $set: { shortListedAt: Date.now(), isShortlisted: true } }
          );
        }
      })
    );
  } catch (error) {
    return failureResponse(
      {},
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

// Get board images from s3 for renaming file-name
export const getBoardImagesFromS3 = async (req: Request, res: Response) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('tenantId propertyId')
      .lean();
    if (!board) {
      return failureResponse(res, 404, [], 'Board not found.');
    }
    const file = await getS3Images(board);
    return successResponse(
      res,
      200,
      { file },
      'S3 images data get successfully.'
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};

// Get board images from s3 for renaming file-name
export const renameAndCopyBoardImagesOfS3 = async (
  req: Request,
  res: Response
) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('tenantId propertyId')
      .lean();
    if (!board) {
      return failureResponse(res, 404, [], 'Board not found.');
    }
    const file = await copyAndRenameS3Images(req.body.data);
    return successResponse(
      res,
      200,
      {},
      'Images has been renamed and copied successfully.'
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || 'Something went wrong'
    );
  }
};
