import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

(async function() {

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_SECRET_KEY
    });
})




const uplodOnClodinary = async (localFilePath)=>{
    try {
        if(!localFilePath)return null
        //upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        console.log("File uploded on cloudnary",response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}
export{uplodOnClodinary}