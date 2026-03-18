const verificationTemplate = (url) => {

    return `

<html>

<head>
<style>

.container{
font-family: Arial;
padding:20px;
text-align:center;
}

.button{
background:#28a745;
padding:12px 25px;
color:white;
text-decoration:none;
border-radius:5px;
font-size:16px;
}

</style>
</head>


<body>

<div class="container">

<h2>Email Verification</h2>

<p>Click the button below to verify your account</p>

<a class="button" href="${url}">Verify Email</a>

</div>


</body>
</html>
`;

};

module.exports = verificationTemplate;