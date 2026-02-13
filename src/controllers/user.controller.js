import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uplodOnClodinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';


// method for generating access and refresh tokens 
const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.genrateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        // console.log("REAL ERROR:", error);
        throw new ApiError(500, "Something went wrong while genrating acess and refresh token")
    }
}

// user registration
const registerUser = asyncHandler(async (req , res )=>{
    // STEPS for user registration
    // get user details from frontend
    // validation - if empty?
    // check if user already exixt - username, email
    // check images - check for avatar
    // uplod them to cloudnary, avatar 
    // create user object - create entry in db
    // remove password and refresh token field from response 
    // check for user creation 
    // return res

    const {fullname, email, username , password} = req.body
    // console.log("Email: ", email);

    // get user details from frontend
    if(
        [fullname, email, username, password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required")
    }
    
    // If user already exixt throw error
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with username or email already exists")
    }

    // checking the status of avatar and coverImage
    const avatarLocalPath = req.files?.avatar[0]?.path

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // uploding on cloudinay
    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar image is required")
    }

    const avatar = await uplodOnClodinary(avatarLocalPath);
    const coverImage = await uplodOnClodinary(coverImageLocalPath)

    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar image is required")
    }

    
    // uploding data in DB
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // checking the status of user into DB by id
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    //returning response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered sucessfully")
    )
})

// user login 
const loginUser = asyncHandler(async (req, res)=>{
    // req body -> data
    // usernamr or email
    // find the user
    // password check
    // generate acess and refresh token
    // send cookies

    const {email, username, password} = req.body

    if(!username && !password){
        throw new ApiError(400, "Username or Email required")
    }

    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Incorrect Password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const logedInUser = await User.findById(user._id).select("-password -refreshToken")

    // now only server can modify the cookies
    const options = {
        httpOnly : true,
        secure : true
    }
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
        {
            user : logedInUser, accessToken, refreshToken
        },
        "User loged in sucessfully"
        )
    )
})

// user logout
const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )


    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged out"))
})

// refreshing the tokens 
const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookie.refreshAccessToken || req.body.refreshAccessToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken ){
            throw new ApiError(401, "Refresh Token expired or used")
        }
    
        const{accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken: newRefreshToken},
                "Access token refreshed sucessfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh token")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}