# Create Single Radcast Lambda Func Setup
---

## Overview

The set up for this lambda fucntion is both sensative and critical, as using a function to stitch and transcode audio really does push the limits of the Lambda use-case (light-weight, quick tasks). That said, there are configurations that make our use function perfectly. 

## NPM Binary Inclusion

The required external libraries are specified in a *package.json* file. A short-coming of the current Lambda environment is that it requires you to install your NPM dependancies _*before*_ building the docker image, this means that the binaries get built for your local operating system (in my case - Mac OSX), which is incorrect for the linux OS that runs in the Docker container. In order to get around this, we force install the correct binaries for the linux target by including these scripts in the *package.json* file:

```
    "scripts": {
    "postinstall": "npm rebuild grpc ffprobe-static ffmpeg-static --target=8.1.0 --target_arch=x64 --target_platform=linux --target_libc=glibc "
  },
```

The binaries we require are listed in this script:

 * grpc (Google uses this - Firestore lib)
 * ffprobe-static (Audio inspcection)
 * ffmpeg-static (Audio processing)

## Bundle size reduction

After installing the dependancies, you need to do an extra step. Lambda functions can only have an uncompressed code size of 250 mb, and we push that limit. So you need to go and DELETE the ffmpeg binaries that get built for any non-linux OS's. Go through the path: ~/node_modules/ffmpeg-static/bin/ - any folders other than linux, delete them. Do the same for ffprobe. The code size for the Lambda should be approx 220 mb. 

## Code deploy

This is the horrible part of lambda, the common way to depoy functions code is to upload a zipped file of the code to S3 and use the share link in S3 to load the new code into the function. There is apparently a way to manage deployment via the command line using AWS Cloud Formation, but I haven't managed to get that to work yet. 

**To deploy new code:**

 1. Upload a zipped file of the repo to the S3 bucket: *radcast-code-store* | Recommend using CLI: `$ aws s3 cp local_file.zip s3://radcast-code-store/radcast-audio/`
 2. In the Lambda management console, navigate to the *createSingleRadcast* function
 3. In the *Function code* section, use the `Code entry type` dropdown to select *"Upload a file from Amazon S3"*
 4. Click Save in the top right hand corner - this will 'deploy' the new code

## Function configuration

These configurations are critical to correct function performance:

 1. Memory allocation: 2048 MB (Optimal = 1280 MB, but while I'm away lets be safe).
 2. Timeout: 5 mins 
 3. ENV vars - none
 4. Execution role: lambda_basic_execution
 5. VPC: No VPC
 6. Concurrency: 1000 invocations

