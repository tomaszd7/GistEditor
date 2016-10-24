function GistApi() {

    this.host = 'https://api.github.com';
    this.user = null;
    this.url = null;

    this.gists = {};
    this.currentGists = {}; // for display and sorting 

    this.error = null;
    this.accessNote = 'Access to my gists';
    this.token = null; // token in 'hashed_token'
    this.logged = false;
    this.credentials = null;

    // with callback 
    /*
     * @param {string} user
     * @param {string} password
     * @param {this object} context
     * @param {function} fnComplete function to call back when user is authorized
     * @info function sends credentials to github and receives new token 
     *      if no valid token was found on github
     *      however I am not using token in further functions but credentials
     */
    this.authenticateUser = function (user, password, context, fnComplete) {     
        $.ajax({
            'url': 'https://api.github.com/authorizations',
            'type': 'POST',
            'context': this,
            'headers': {
                'Authorization': 'Basic ' + btoa(user + ':' + password)
            },
            'data': JSON.stringify({
                'scopes': ['gist'], 
                'note': 'Access to my gists'
            }),
            'success': function(data) {  
                this.token = data;
                this.logged = true;
            },
            'error': function (xhr, status, error) {
                this.error = {
                    'response': xhr.responseJSON,
                    'status': xhr.status,
                    'statusText': xhr.statusText
                };
                console.log(this.error);
            },
            'complete': function () {
                console.log('New authentication completed');                
                if (this.logged && fnComplete) {
                    fnComplete(context);
                }
            }
        });
    };

    // with callback
    /*
     * @param {string} user
     * @param {string} password
     * @param {this object} context
     * @param {function} fnSuccess function to call back when user is authorized
     * @param {function} fnFailure function to call back when user is NOT authorized
     * @info function gets tokens from github based oncredentials and if one is matched 
     *      with out this.accessNote - success, else - tried to create new token with 
     *      this.authenticateUser else shows error
     */
    this.getAuthorizations = function (user, password, context, fnSuccess, fnFailure) {
        this.user = user;
        this.url = this.host + '/users/' + this.user + '/gists';
        this.credentials = 'Basic ' + btoa(user + ':' + password);
        
        // clear previous data
        this.error = null;
        this.logged = false;
        this.token = null;        
        
        this.user = user;
    
        $.ajax({
            'url': 'https://api.github.com/authorizations',
            'type': 'GET',
            'context': this,
            'headers': {
                'Authorization': this.credentials
            },
            'success': function(data) {
                // gets array of tokens ... check mine in 'note': this.accessNote
                for (var i = 0; i < data.length; i++) {
                    if (data[i].note === this.accessNote) {
                        this.token = data[i];
                        this.logged = true;
                        break;
                    }
                }                             
            },
            'error': function (xhr) {
                this.error = {
                    'response': xhr.responseJSON,
                    'status': xhr.status,
                    'statusText': xhr.statusText
                };
                console.log(this.error);
            },
            'complete': function () {
                console.log('Get authorizations completed');
                // if success - token is already there
                if (this.logged && fnSuccess) {
                    fnSuccess(context);
                } else {            
                // try to create new token 
                    if (!this.error && !this.logged) {
                        this.authenticateUser(user, password, context, fnSuccess);
                    } else if (this.error && !this.error.status === 401) {     
                        this.authenticateUser(user, password, context, fnSuccess);
                    } else {
                        // login failed so display to user - wrong login 
                        if (fnFailure) {
                            fnFailure(context);
                        }
                    }
                }            
            }            
        });
    };                    

    /*
     * @param {this object} context
     * @param {function} fnComplete - function to call back for displaying gist list 
     * @info function to get all gists from github
     *      and store them in this.gists and copy in this.currentGists
     */
    this.getUserGists = function (context, fnComplete) {
        $.ajax({
            'url': 'https://api.github.com/gists',
            'headers': {
                'Accept': 'application/vnd.github.v3+json',
//                'Authorization': 'token ' + this.token.hashed_token
                'Authorization': this.credentials
            },
            'context': this,
            'method': 'GET',
            'success': function (data) {
                var self = this;
                if (data) {
                    data.forEach(function (item) {
                        self.gists[item.id] = {
                            'description': item.description,
                            'created_at': item.created_at,
                            'url': item.url,
                            'public': item.public
                        };
                        
                        self.currentGists[item.id] = {
                            'description': item.description,
                            'created_at': item.created_at,
                            'url': item.url,
                            'public': item.public
                        };
                    });
                    console.log('User gists uploaded');
                } else {
                    // no data 
                }
            },
            'error': function (xhr, status) {
                console.log(xhr, status);
            },
            'complete': function () {
                if (fnComplete) {
                    fnComplete(context);
                }
            }
        });
    };

    /*
     * @param {string} gistId
     * @param {this object} context
     * @param {function} fnComplete - function to display gist details as call back
     * @info function gets details of gist from github, no credentials 
     */
    this.getGistDetails = function (gistId, context, fnComplete) {
            var gistPath = this.gists[gistId];
            $.ajax({
                'url': gistPath.url,
                'headers': {
                    'Accept': 'application/vnd.github.v3+json'
                },
                'context': this,
                'success': function (data) {
                    gistPath['files'] = {};
                    var filename = Object.keys(data.files)[0];
                    gistPath['files'][filename] = {
                        'content': data.files[filename]['content'],
                        'language': data.files[filename]['language'],
                        'size': data.files[filename]['size']
                    };
                },
                'error': function (xhr, status) {
                    console.log(xhr, status);
                },
                'complete': function () {
                    console.log('single gist reloaded');
                    if (fnComplete) {
                        fnComplete(context, gistId);
                    }
                }
            });
    };

    /*
     * @param {string} gistId
     * @param {string} newContent
     * @info function saves new content from editor field into github gist 
     */
    this.editGistDetails = function (gistId, newContent) {        
        var filename = Object.keys(this.gists[gistId].files)[0];        
        // prepare json body 
        var jsonBody = {};
        jsonBody['description'] = this.gists[gistId].description;
        jsonBody['public'] = this.gists[gistId].public;
        jsonBody['files'] = {};
        jsonBody['files'][filename] = {
            'content': newContent
        };              
        // save to api.gists variables
        this.gists[gistId].files[filename].content = newContent;
        
        $.ajax({
            'url': this.gists[gistId].url,
//            'context': this,
            'headers': {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': this.credentials                
            },
            'method': 'PATCH',
            'data': JSON.stringify(jsonBody),
            'success': function (data) {
                console.log('Editted , data');
            },
            'error': function (xhr, status) {
                console.log(xhr, status);
            },
            'complete': function () {
                console.log('edit completed');
            }
        });

    };

}