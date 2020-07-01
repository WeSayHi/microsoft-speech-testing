var bucketName = BUCKET_NAME;
var bucketRegion = "us-east-1";
var IdentityPoolId = "us-east-1:3efbe2a5-c38f-433a-8720-37b7b5f61a7d";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId,
  }),
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: bucketName },
});

function s3upload() {
  var files = document.getElementById("fileUpload").files;
  if (files) {
    var file = files[0];
    var fileName = file.name;
    var filePath = "my-first-bucket-path/" + fileName;
    var fileUrl =
      "https://" + BUCKET_REGION + ".amazonaws.com/my-first-bucket/" + filePath;

    s3.upload(
      {
        Key: filePath,
        Body: file,
        ACL: "public-read",
      },
      function (err, data) {
        if (err) {
          reject("error");
        }

        alert("Successfully Uploaded!");
      }
    ).on("httpUploadProgress", function (progress) {
      var uploaded = parseInt((progress.loaded * 100) / progress.total);
      $("progress").attr("value", uploaded);
    });
  }
}
