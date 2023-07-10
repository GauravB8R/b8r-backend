import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { successResponse, failureResponse } from '../helpers/api-response.helper';
import User from '../models/user.model';
import { encrypt, decrypt } from '../services/crypto.service';

/**
 * Generate JWT token using firebase token and user details
 */
const generateJWTToken = (user) =>  {
    return jwt.sign(user.toJSON(), process.env.SECRET, { expiresIn: process.env.JWT_EXPIRY });
};

//  Sign up the new user details and generate the JWT token for that user
export const signUpUser = async (req: Request, res: Response) => {
   try {
        console.log('req', req.body);
        let userData: any = {};
        userData = req.body;
        const userExist = await User.findOne({ email: userData.email });
        if (!userExist) {
              const userObj = new User(req.body);
              const userSave = await userObj.save();
              const jwtToken = generateJWTToken(userSave);
              return successResponse(res, 200, { user: userSave, jwt_token: jwtToken }, 'User Signup Successfully.');
        } else {
            return failureResponse(res, 403, [], 'Already exists given email id.');
        }
    } catch (error) {
       return failureResponse(res, error.status || 500, error, error.message || 'Something went wrong');
   }
};

//  Get all users
export const getAllUsersList = async (_: Request, res: Response) => {
    try {
        const users = await User.find().lean();
        if (!users) {
          throw { status: 404, message: 'Users not found.' };
        }
        return successResponse(res, 200, { users }, 'Users found successfully.');
      } catch (error) {
        return failureResponse(res, error.status || 500, error, error.message || 'Something went wrong');
    }
};

// Login user
export const signInUser = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const userExist = await User.findOne({$and: [{ email: userData.email }, { phoneNumber: userData.phoneNumber }]});
    if (!userExist) {
      return failureResponse(res, 404, [], 'User not found!');
    } else {
      const dbPassword = await decrypt(userData.password, userExist.password);
      if (dbPassword) {
        const jwtToken = generateJWTToken(userExist);
        return successResponse(res, 200, { user: userExist, jwtToken: jwtToken }, 'User Login Successfully.');
      } else {
        return failureResponse(res, 401, [], 'Unauthorized Access');
      }
    }
  } catch (error) {
    return failureResponse(res, error.status || 500, error, error.message || 'Something went wrong');
  }
};

// Forgot and Reset password of user
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const updatedData = req.body;
    User.findOneAndUpdate({  phoneNumber: updatedData.phoneNumber }, { $set: { password: updatedData.password,  confirmPassword: updatedData.confirmPassword} }, (err, user) => {
      if (err) {
        return failureResponse(res, 500, err, err.message || 'Internal Server Error');
      } else if (user) {
        return successResponse(res, 200, { user }, 'Password Updated Successfully.');
      } else {
        return failureResponse(res, 404, err, err.message || 'Phone Number Not Found');
      }
    });
  } catch (error) {
    return failureResponse(res, error.status || 500, error, error.message || 'Something went wrong');
  }
};






