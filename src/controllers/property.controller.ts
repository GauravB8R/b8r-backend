import { Request, Response } from "express";
import {
  successResponse,
  failureResponse,
} from "../helpers/api-response.helper";
import Property from "../models/property.model";
import PropertyDetail from "../models/propertyDetail.model";
import AssignedProperty from "../models/assignedProperty.model";
import { Types } from "mongoose";

// Add new property
export const addProperty = async (req: Request, res: Response) => {
  try {
    const tempData = req.body;
    tempData.propertyData.propertyAgentId = new Types.ObjectId(req.user.user._id);

    //  Check version of property based on below conditions while add new property
    //   1. If same user try to enter again same value for houseName, societyName, pinCode then
    //         it should return as already exist property with this values
    //   2. If another user try to add property and it matches with houseName, societyName, pinCode then increment it's version
    Property.find({
      $and: [
        { houseName: tempData.houseName },
        { societyName: tempData.societyName },
        { pinCode: tempData.pinCode },
      ],
    })
      .populate("propertyDetails")
      .exec(async (error: any, propertyExist: any) => {
        if (error) {
          return failureResponse(
            res,
            error.status || 500,
            error,
            error.message || "Something went wrong"
          );
        } else if (propertyExist && propertyExist.length) {
          const userProperty = propertyExist[0].propertyDetails.filter((x) =>
            x.propertyAgentId.equals(tempData.propertyData.propertyAgentId)
          );
          if (userProperty && userProperty.length) {
            return failureResponse(
              res,
              403,
              [],
              "Property already exist with this value"
            );
          } else {
            tempData.propertyData.version =
              propertyExist[0].propertyDetails.length + 1;
            const detailObj = new PropertyDetail(tempData.propertyData);
            const savedObj: any = await detailObj.save();
            updatePropertyDetails(propertyExist[0]._id, savedObj._id, res);
          }
        } else {
          const detailObj = new PropertyDetail(tempData.propertyData);
          const savedObj: any = await detailObj.save();
          const propertyObj = new Property(tempData);
          const saveObj = await propertyObj.save();
          updatePropertyDetails(saveObj._id, savedObj._id, res);
        }
      });
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Push property detail id in property table
const updatePropertyDetails = (id, detailsId, res) => {
  const detailId = new Types.ObjectId(detailsId);
  Property.findByIdAndUpdate(
    { _id: id },
    { $push: { propertyDetails: detailId } },
    { new: true }
  )
    .populate("propertyDetails")
    .exec((error, updatedRecord) => {
      if (error) {
        console.log("error while update", error);
        return failureResponse(
          res,
          500,
          [],
          error.message || "Something went wrong"
        );
      } else {
        console.log("updatedRecord.......", updatedRecord);
        return successResponse(
          res,
          200,
          { property: updatedRecord },
          "New property added successfully."
        );
      }
    });
};

//  Get all properties
export const getAllPropertyList = async (_: Request, res: Response) => {
  try {
    const properties = await Property.find().populate("propertyDetails").lean();
    if (!properties) {
      return failureResponse(res, 404, [], "Properties not found.");
    }
    return successResponse(
      res,
      200,
      { properties },
      "Properties found successfully."
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Get property by id
export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("propertyDetails")
      .lean();
    if (!property) {
      return failureResponse(res, 404, [], "Property not found.");
    }
    return successResponse(
      res,
      200,
      { property },
      "Property found successfully."
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Assign property to Field Agent
export const assignPropertyToFA = async (req: Request, res: Response) => {
  try {
    const dataObj = req.body;
    dataObj.propertyAgentId = req.user.user._id;
    const existing = await AssignedProperty.findOne({
      propertyId: dataObj.propertyId,
    });
    if (existing) {
      return failureResponse(res, 403, [], "Property already assigned");
    } else {
      const detailObj = new AssignedProperty(dataObj);
      const savedObj: any = await detailObj.save();
      return successResponse(
        res,
        200,
        { assigned: savedObj },
        "Property assigned to field agent successfully."
      );
    }
  } catch (error) {
    return failureResponse(
      res,
      500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Get property counts in agent dashboard
export const getPropertyCounts = async (req: Request, res: Response) => {
  try {
    const pendingProperties = [];
    const verifiedProperties = [];
    const propertyAgentId = new Types.ObjectId(req.user.user._id);
    const property = await AssignedProperty.find({
      fieldAgentId: propertyAgentId,
    }).populate("propertyId");
    if (!property) {
      return failureResponse(res, 500, [], "Something went wrong");
    }
    property.forEach(function (doc) {
      if (doc.propertyId.status === "Pending") {
        pendingProperties.push(doc);
      } else if (doc.propertyId.status === "Verified") {
        verifiedProperties.push(doc);
      }
    });
    return successResponse(
      res,
      200,
      {
        pending: pendingProperties.length,
        verified: verifiedProperties.length,
      },
      "Property found successfully."
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Get pending property for field agent dashboard
export const getFieldAgentPendingProperty = async (
  req: Request,
  res: Response
) => {
  try {
    const propertyAgentId = new Types.ObjectId(req.user.user._id);
    const property = await AssignedProperty.find({ fieldAgentId: propertyAgentId })
      .populate("propertyImageId")
      .populate({ path: "propertyId", populate: { path: "propertyDetails" } });
    if (!property) {
      return failureResponse(res, 500, [], "Something went wrong");
    }
    const pendingList = property.filter(
      (x) => x.propertyId.status === "Pending"
    );
    return successResponse(
      res,
      200,
      { property: pendingList },
      "Pending property list get successfully."
    );
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Verify property
export const verifyProperty = async (req: Request, res: Response) => {
  try {
    const tempData = req.body;
    tempData.propertyData.propertyAgentId = new Types.ObjectId(req.user.user._id);
    tempData.status = "Verified";
    Property.find({
      $and: [
        { houseName: tempData.houseName },
        { societyName: tempData.societyName },
        { pinCode: tempData.pinCode },
      ],
    })
      .populate("propertyDetails")
      .exec(async (error: any, propertyExist: any) => {
        if (error) {
          return failureResponse(
            res,
            error.status || 500,
            error,
            error.message || "Something went wrong"
          );
        } else if (propertyExist && propertyExist.length) {
          tempData.propertyData.version =
            propertyExist[0].propertyDetails.length + 1;
          const detailObj = new PropertyDetail(tempData.propertyData);
          const savedObj: any = await detailObj.save();
          updatePropertyDetails(propertyExist[0]._id, savedObj._id, res);
        } else {
          const detailObj = new PropertyDetail(tempData.propertyData);
          const savedObj: any = await detailObj.save();
          const propertyObj = new Property(tempData);
          const saveObj = await propertyObj.save();
          updatePropertyDetails(saveObj._id, savedObj._id, res);
        }
      });
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Edit property status with close listing property
export const closeListingProperty = async (req: Request, res: Response) => {
  try {
    const tempData = req.body;
    const id = new Types.ObjectId(tempData.propertyId);
    Property.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          closeListingStatus: tempData.closeListingStatus,
          closeListingDetails: tempData.closeListingDetails,
        },
      },
      { new: true }
    )
      .populate("propertyDetails")
      .exec((error, updatedRecord) => {
        if (error) {
          console.log("error while update", error);
          return failureResponse(
            res,
            500,
            [],
            error.message || "Something went wrong"
          );
        } else {
          console.log("updatedRecord.......", updatedRecord);
          return successResponse(
            res,
            200,
            { property: updatedRecord },
            "Property status updated successfully."
          );
        }
      });
  } catch (error) {
    return failureResponse(
      res,
      error.status || 500,
      error,
      error.message || "Something went wrong"
    );
  }
};

// Short-listed shared property
export const shortlistedProperty = async (req: Request, res: Response) => {
  try {
  } catch (error) {}
};
