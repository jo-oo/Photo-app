/**
* Album Controller
*/

const models = require('../models');
const debug = require('debug')('controllers:album_controller');
const { matchedData, validationResult } = require('express-validator');


//Methods to be used in requests
const getUsersSpecificAlbum = async (req, res) => {	
	//get users albums
	const user = await models.User.fetchById(req.user.user_id, { withRelated: ['albums'] });
   
   //gets the albums-array from user and uses find method over that array to find specific id
   const usersAlbum = user.related('albums').find(album => album.id == req.params.albumId);
}




const validationResults = async (req, res) => {	
	  //check for validation errors first
	  const errors = validationResult(req);

	  //if errors, show them
	  if (!errors.isEmpty()) {
		  return res.status(400).send({
			  status: 'fail',
			  data: errors.array()
		  });
	  }
    // Get the request data after it has gone through the validation and save it in ValidData
   	const validData = matchedData(req);
}

/** 
 * 1. Get all albums- method
 *
 * GET http://localhost:3000/albums
 */ 
 const getAllAlbums = async (req, res) => {	
    //get users albums
	const user = await models.User.fetchById(req.user.user_id, { withRelated: ['albums'] });
	res.status(200).send({
		status: 'This is your albums',
		data: {
			album: user.related('albums'), //only gets the albums-array
		},
	});
}


/** 
 * 2. Get specific album- method
 *
 * GET http://localhost:3000/albums/albumId
 */ 
const showAlbum = async (req, res) => {
 
	getUsersSpecificAlbum();

		//if not found the users album
		if(!usersAlbum){
			res.status(404).send({
				status: "no albums found for :" + req.params.albumId,
				message: 'Photo with this id was not found',
			});
		}

   	 	//if request suceeded, send this back to the user: 
		res.status(200).send({
			status: 'success' + req.params.albumId,
			data: {
				album: usersAlbum,
			},
		});	
}

/** 
 * 3. Store a new album- method
 *
 * POST http://localhost:3000/albums
 */ 
   
 const createAlbum = async (req, res) => {
  
	validationResults();

   // Apply the users id to the validated data, to be used when creating new photo
   	validData.user_id = req.user.user_id;
	
    try {
        //saves a object to the database
        const newAlbum = await new models.Album(validData).save();

        // Inform the user that the album was created
        res.status(201).send({
            status: 'success',
            data: {
                "title": validData.title,
                "url": validData.url,
                "comment": validData.comment,
                "user_id": validData.user_id,
                "id": newAlbum.id
            }
        })

    } catch (error) {
        // Throw an error if creating an album failed
        res.status(500).send({
            status: 'Error',
            message: 'Issues when creating a new album'
        });
        throw error;
    }
}



/** 
 * 4. Update album by ID - method
 *
 * PUT http://localhost:3000/albums/:albumId
 */
 const updateAlbum = async (req, res) => {

	getUsersSpecificAlbum();
  
	//check if album exists
	if (!usersAlbum) {
	  res.status(404).send({
		  status: 'fail',
		  data: 'Album Not Found' + req.params.albumId,
	  });
	  return;
	}
  
	//check that the album belongs to the user, otherwise: reject the request
	if (!usersAlbum) {
	  return res.status(403).send({
		  status: 'fail',
		  data: 'This album is not yours!',
	  });
	 }
	  
	validationResults();
	
	try {
		const updatedAlbum = await usersAlbum.save(validData);
		res.send({
			status: 'success',
			data: updatedAlbum,
		});
	} catch (error) {
		  es.status(500).send({
			status: 'error',
			message: 'Exception thrown in database when updating a new album.',
		});
	   throw error;
	}
  }


/** 
 * 5. POST Add photo to an existing album - method
 *
 * POST http://localhost:3000//albums/:albumId/photos
 */
 const addPhotoToAlbum = async (req, res) => {
	
	validationResults();

	// Get user and it´s relation to both albums & photos
	const user = await models.User.fetchById(req.user.user_id,{ withRelated: ['albums', 'photos'] });

	// Get albums with related photos
	const album = await models.Album.fetchById(req.params.albumId, { withRelated: ['photos'] });

	// Get the requested album by id
	const usersAlbum = user.related('albums').find(album => album.id == req.params.albumId);

	// Get only photos belonging to the user
	const usersPhoto = user.related('photos').find(photo => photo.id == validData.photo_id);

	// Check if photo already exists in album
	const existingPhoto = album.related('photos').find(photo => photo.id == validData.photo_id);

	//If album does not exist, abort request
	if (!album) {
		debug("Album to update was not found. %o", { id: album });
		res.status(404).send({
			status: 'fail',
			data: 'Album Not Found',
		});
		return;
	}

	// If photo already exist, abort request
	if (existingPhoto) {
		return res.status(404).send({
			status: 'fail',
			data: 'Photo already exists.',
		});
	}

	
	// Checks that the photo or album belongs to the user
	if (!usersAlbum || !usersPhoto) {
		return res.status(401).send({
			status: 'fail',
			data: 'Album or Photo does not belong to user',
			photo_id: validData.photo_id,
			albumId: req.params.albumId
		});
	}

	try {
		const result = await usersAlbum.photos().attach(validData.photo_id);
		debug("Added photo to Album successfully: %O", result, result.length);

		res.status(200).send({
			status: 'success',
			data: null,
		});

	} catch (error) {
		res.status(500).send({
			status: 'error',
			message: 'Exception thrown in database when adding a photo to an album.',
		});
		throw error;	
}};





/** 
 * 6. Delete album by ID - method
 *
 * DELETE http://localhost:3000/albums/:albumId
 */
 const deleteAlbum = async (req, res) => {

	getUsersSpecificAlbum();

	//check if album exists
	if (!usersAlbum) {
	  //debug('Album to update was not found. %o', { id: req.params.albumId });
	  res.status(404).send({
		  status: 'fail',
		  data: 'Album not found' + req.params.albumId,
	  });
	  return;
	}
  
	  try {
		  const detachPhotos = await usersAlbum.photos().detach();
		  const deletedAlbum = await usersAlbum.destroy();
		  debug('Deleted album successfully: %O', deletedAlbum);
  
		  res.status(200).send({
			  status: 'success',
			  data: null,
		  });
	  } catch (error) {
		  res.status(500).send({
			  status: 'error',
			  message: 'Exception thrown in database when deleting album.',
		  });
		  throw error;
	  }
  }

  //const addMultiplePhotosToAlbum




module.exports = {
	getAllAlbums,
	showAlbum,
	createAlbum,
	updateAlbum,
	deleteAlbum,
	addPhotoToAlbum,
	//addMultiplePhotosToAlbum,
}
