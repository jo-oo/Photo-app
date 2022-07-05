/**
 * Album Validation Rules
 */

 const { body } = require('express-validator'); //express-validator - hjälper till att säkerställa så datan är säker, så lösenordet användaren skriver in är trimmat osv, att det är en viss längd mm. KALLAS SANITATION : att den renar datan
 const models = require('../models'); //reads the models


 /**
 * Create new Album - Validation rules
 * POST /albums
 */
const createAlbumRules = [
   
	//checks that the user typed in a title, that it is a string, and minimum 3 chars long
    body('AlbumTitle').exists().isString().isLength({ min: 3 }).custom(async value => {  
        //function that checks if title already exists in database of that User
		const AlbumTitle = await new models.Album({ AlbumTitle: value }).fetch({ require: false }); //refers to the model Album
		
        //if Album exists, reject
        if (AlbumTitle) {
			return Promise.reject("This Album already exists.");
		}

        //else: resolve
		return Promise.resolve();
	}),
    
    //body('url').exists().isURL().isString(),
    //body('comment').optional().isString().isLength({ min: 3 }),

];

/** 
* Update Album validation rules
*/
const updateAlbumRules = [
    body('AlbumTitle').exists().isString().isLength({ min: 3 }),
];


/** 
* Add Photo to Album validation rules
*/
const addPhotoToAlbumRules = [
   
	//checks that the user typed in a photo id, that it is an int, and 
    body('photoId').exists().isInt().custom(async value => {  
        //function that checks if title already exists in database of that User
		const photo = await new models.Photo({ id: value }).fetch({ require: false });
		
        //if Photo exists, reject
        if (photo) {
			return Promise.reject("This Photo already exists.");
		}

        //else: resolve
		return Promise.resolve();
	}),
];


module.exports = {
	createAlbumRules,
    updateAlbumRules,
    addPhotoToAlbumRules
};