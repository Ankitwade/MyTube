import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'


const uplodOnClodinary = async (localFilePath)=>{
    try {
        cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_SECRET_KEY
        });
        if(!localFilePath)return null
        //upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        // file had been uploded sucessfully 
        // console.log("File uploded on cloudnary",response.url);
        if(fs.existsSync(localFilePath)){
        fs.unlinkSync(localFilePath)}else{
            console.log("ERROR is there in cloud")
        }
        return response;
    } catch(error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.error("Cloudinary upload error:", error);
        return null;
    }
}
export{uplodOnClodinary}
