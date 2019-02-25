# Manual Testing

// AWS API Gateway may change the endpoint, but for now:
Root endpoint: https://o575vsso14.execute-api.us-east-2.amazonaws.com/prod

### Create user post request
'''
    curl -X POST -H "Content-Type:application/json" https://o575vsso14.execute-api.us-east-2.amazonaws.com/prod/createSingleRadcast -d '{
    "apiKey":"56128eebf5a64cb6875b8d1c4789b216cf2331aa",
    "userUIDs":["jYFlnfqdYteeLoH1JSHg9iS6B9n1"]
    }'
'''