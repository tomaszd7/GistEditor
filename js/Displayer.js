function Displayer(apiObject) {

    this.api = apiObject;
    this.codeMirror = null;

    /* tag ids from index.html stored here 
     * 
     *but I am not consequent in the code :/ */
    
    // html ids for sections 
    this.menuId = 'menu';
    this.listId = 'list';
    this.detailId = 'details';
    this.userId = 'user';
    this.btnGetGistsId = 'get-gists';
    this.loginBtnId = 'login-btn';
    this.logoutBtnId = 'logout-btn';
    
    // gist list classes
    this.activeClass = 'bg-primary';
    this.listClass = 'bg-info';

    // header classes
    this.languageClass = 'language';
    this.sizeClass = 'size';
    this.createdClass = 'created';
    
    this.currentGistId = null;

    this.displayUser = function (context) {
        console.log('displaying user');
        $('#' + context.userId).html(context.api.user).addClass('bg-primary');
    };

    // callback function 
    /*
     * @param {this object} context
     */
    this.displayGistsList = function (context) {
        // remove current list 
        $('#' + context.listId + ' div.list-box').remove();
        // add list of gists 
        for (var key in context.api.currentGists) {
            
            var $div = $('<div>');
            var $p = $('<p>');
            $p.attr('id', key);
            $p.addClass('bg-info text-center');
            $p.html(context.api.currentGists[key]['description']);
            // add private/ public as after
            var $p_public = $('<div>').html(context.api.currentGists[key]['public'] === true ? 'Public' : 'Private');
            
            $div.addClass('list-box');
            $p_public.addClass('list-public bg-primary small');
            $div.append($p);
            $div.append($p_public);
            $('#' + context.listId).append($div);
        }
    };

    // callback funciton
    /*
     * @param {this object} context
     * @param {string} gistId
     */
    this.displayGistDetails = function (context, gistId) {
        // save current gist id for future actions and easy access
        context.currentGistId = gistId;
        
        // change active classes on gist list
        $('#' + context.listId + ' p.' + context.activeClass)
                .removeClass(context.activeClass).addClass(context.listClass);
        $('#' + gistId).removeClass(context.listClass).addClass(context.activeClass);
        
        var gistPath = context.api.gists[gistId].files;
        var filename = Object.keys(gistPath)[0];
        // add header 
        
        $('.' + context.languageClass).text(gistPath[filename].language);
        $('.' + context.sizeClass).text(gistPath[filename].size);
        $('.' + context.createdClass).text(context.api.gists[gistId].created_at);
        
        var content = gistPath[filename].content;  
        
        // add details          
        // adding codeMirror       
        if (context.codeMirror) {
            context.codeMirror.setValue(content);
        } else {
            context.codeMirror = CodeMirror($('#textarea')[0], {
                value: content,
                mode: "javascript",
                lineNumbers: true,
                lineWrapping: true
            });  
        }
    };

    /* 
     * main function after success login 
     */
    this.displayApplication = function(context) {
        $('#logging').toggleClass('none');
        $('#application').toggleClass('none');     
        context.displayUser(context);        
    };
    
    this.displayLoginFailure = function(context) {
        // adding class and disabling login button
        $('#login-btn').removeClass('btn-primary').addClass('btn-danger').attr('disabled', 'disabled');        
    }
    
    /*
     * disable Save button after new gist details upload
     */
    this.disableSaveButton = function () {
        $('.header button').attr('disabled', 'disabled');  
    }


    /*
     * function for recreating gist list as current gist list 
     * when Public/private/ all buttons are clicked
     * full list taken from github is not changed
     */
    this.gistsObjectCopy = function(gists, bool) {        
        var newObj = {};                
        for (var id in gists) {
            if (bool === 'all') {
                newObj[id] = gists[id];
            } else {
                if (gists[id].public === bool) {                    
                    newObj[id] = gists[id];
                }
            }            
        }
        return newObj;
    };

    this.main = function () {

        var self = this;
        
        // listeners 

        // get list of gits for current user button 
        $('#' + this.btnGetGistsId).click(function (event) {
            self.api.getUserGists(self, self.displayGistsList); // callback 
        });

        // get details of gist for current gist 
        // check if aready not been used - then do not upload again         
        $('#' + this.listId).click(function (event) {
            if (event.target.tagName === 'P') {
                if(self.api.gists[event.target.id].files) {
                    console.log('already uploaded so redisplay gist');
                    self.displayGistDetails(self, event.target.id);
                } else {
                    self.api.getGistDetails(event.target.id, self, self.displayGistDetails);                    
                }                
            }
            self.disableSaveButton();
        });
                
        // save gist details         
        $('#' + this.detailId + ' button').click(function(event) {
            // get current gist content 
            console.log('inside Save');
            if (self.currentGistId) {
                var newContent = self.codeMirror.getValue();
                self.api.editGistDetails(self.currentGistId, newContent);                
            }       
            // disabled save button 
            self.disableSaveButton();          
        });        
        
        // unlock save button when textarea is modified 
        $('#textarea').keyup(function(event) {
            $('.header button').removeAttr('disabled');            
        });
        
        // log user 
        $('#' + this.loginBtnId).click(function(event) {
            event.preventDefault();
            var user = $('form input[name="user"]').val();
            var password = $('form input[name="password"]').val();
            
            self.api.getAuthorizations(user, password, self, self.displayApplication, self.displayLoginFailure);
        });
        
        // logout user 
        $('#' + this.logoutBtnId).click(function(event) {
            console.log('logging out');
            location.reload(true);
        });
        
        //unlocking disabled login after login failure
        $('#logging input').focus(function(event) {
            var $loginBtn = $('#login-btn');
            if ( $loginBtn.attr('disabled') === 'disabled') {
                // unlock 
                $loginBtn.removeClass('btn-danger').addClass('btn-primary').removeAttr('disabled');
            }            
        });
        
        
        // buttons for displaying public/ private gists         
        $('#buttons').click(function(event) {
            
            function reDisplay() {
                $('#buttons button.btn-primary').removeClass('btn-primary').addClass('btn-info');
                $(event.target).removeClass('btn-info').addClass('btn-primary');
                self.displayGistsList(self); 
            }
            
            switch (event.target.name) {                
                case 'public':
                    self.api.currentGists = self.gistsObjectCopy(self.api.gists, true);
                    reDisplay();
                    break;
                case 'private':
                    self.api.currentGists = self.gistsObjectCopy(self.api.gists, false);
                    reDisplay();
                    break;
                case 'all':
                    self.api.currentGists = self.gistsObjectCopy(self.api.gists, 'all');
                    reDisplay();
                    break;                             
            }
        });        
    };

}