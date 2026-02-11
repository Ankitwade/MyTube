import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uplodOnClodinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


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
    console.log("Email: ", email);

    // get user details from frontend
    if(
        [fullname, email, username, password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required")
    }
    
    // If user already exixt throw error
    const existedUser = User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with username or email already exists")
    }

    // checking the status of avatar and coverImage
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    // uploding on cloudinay
    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar image is required")
    }

    const avatar = await uplodOnClodinary(avatarLocalPath)
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
    const createdUser = await user.findById(user._id).select(
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

export {registerUser}