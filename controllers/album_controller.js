/**
* Album Controller
*/

const models = require('../models');
const debug = require('debug')('controllers:album_controller');
const { matchedData, validationResult } = require('express-validator');

/** 
 * 1. Get all albums- method
 *
 * GET http://localhost:3000/albums
 */ 
 const getAllAlbums = async (req, res) => {	
    //get users albums
	const user = await models.User.fetchById(req.user.user_id, { withRelated: ['albums'] });
	res.status(200).send({
		status: 'success',
		data: user.related('albums'), //only gets the albums-array
	});
}

/** 
 * 2. Get specific album- method
 *
 * GET http://localhost:3000/albums/albumId
 */ 
const showAlbum = async (req, res) => {
	//get users albums
	const user = await models.User.fetchById(req.user.user_id, { withRelated: ['albums'] });

	//gets the albums-array from user and uses find method over that array to find specific id
    const usersAlbum = user.related('albums').find(album => album.id == req.params.albumId);
	
		//if not found the users album
		if(!usersAlbum){
			res.status(404).send({
				status: "no albums found for :" + req.params.albumId,
				message: 'Album with this id was not found',
			});
		}

		const albumWithPhotos = await models.Album.fetchById(req.params.albumId, {
			withRelated: ['photos'],
		});

   	 	//if request suceeded, send this back to the user: 
		res.status(200).send({
			status: 'success',
			data: albumWithPhotos,
		});	
	}

/** 
 * 3. Store a new album- method
 *
 * POST http://localhost:3000/albums
 */ 
   
 const createAlbum = async (req, res) => {
  
	//check for validation errors first
	const errors = validationResult(req);

	//if errors, show them
	if (!errors.isEmpty()) {
		return res.status(400).send({
			status: 'fail',
			data: errors.array()
		});
	}

    //get the request data after it has gone through the validation and save it in ValidData
   const validData = matchedData(req);
	
   //apply the users id to the validated data, to be used when creating new photo
   	validData.user_id = req.user.user_id;
	
    try {
        //saves a object to the data base
        const newAlbum = await new models.Album(validData).save();

        //inform the user that the album was created
        res.status(200).send({
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
        //throw an error if creating an album failed
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

	//get users albums
	const user = await models.User.fetchById(req.user.user_id, { withRelated: ['albums'] });

	//get album by id
	const usersAlbum = user.related('albums').find(album => album.id == req.params.albumId);
  
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
	  
	//check for validation errors first
	const errors = validationResult(req);

	//if errors, show them
		if (!errors.isEmpty()) {
			return res.status(400).send({
				status: 'fail',
				data: errors.array()
			});
		}

	//get the request data after it has gone through the validation and save it in ValidData
	const validData = matchedData(req);
	
	try {
		const updatedAlbum = await usersAlbum.save(validData);
		res.send({
			status: 'success',
			data: updatedAlbum,
		});
	} catch (error) {
		  res.status(500).send({
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
	
	//check for validation errors first
	const errors = validationResult(req);

	//if errors, show them
	if (!errors.isEmpty()) {
		return res.status(400).send({
			status: 'fail',
			data: errors.array()
		});
	}
    
	//get the request data after it has gone through the validation and save it in ValidData
    const validData = matchedData(req);

	//get user and it´s relation to both albums & photos
	const user = await models.User.fetchById(req.user.user_id,{ withRelated: ['albums', 'photos'] });

	//get albums with related photos
	const album = await models.Album.fetchById(req.params.albumId, { withRelated: ['photos'] });

	//get the requested album by id
	const usersAlbum = user.related('albums').find(album => album.id == req.params.albumId);

	//get only photos belonging to the user
	const usersPhoto = user.related('photos').find(photo => photo.id == validData.photo_id);

	//check if photo already exists in album
	const existingPhoto = album.related('photos').find(photo => photo.id == validData.photo_id);

	//if album does not exist, abort request
	if (!album) {
		res.status(404).send({
			status: 'fail',
			data: 'Album Not Found',
		});
		return;
	}

	//if photo already exist, abort request
	if (existingPhoto) {
		return res.status(404).send({
			status: 'fail',
			data: 'Photo already exists.',
		});
	}
	
	//checks that the photo or album belongs to the user
	if (!usersAlbum || !usersPhoto) {
		return res.status(401).send({
			status: 'fail',
			data: 'This album or photo does not exist',
			photo_id: validData.photo_id,
			albumId: req.params.albumId
		});
	}

	try {
		const result = await usersAlbum.photos().attach(validData.photo_id);
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
 * 6. Delete album by ID - method (incl. the links to the photos, but not the photos themselves)
 *
 * DELETE http://localhost:3000/albums/:albumId
 */
const deleteAlbum = async (req, res) => {
	//get users albums
	const user = await models.User.fetchById(req.user.user_id, { withRelated: ['albums'] });

	//get album by id
	const usersAlbum = user.related('albums').find(album => album.id == req.params.albumId);

	//check if album exists
	if (!usersAlbum) {
	  	res.status(404).send({
			status: 'fail',
			data: 'Album not found',
	  	});
	return;
	}
  	try {
		//detach photos
		await usersAlbum.photos().detach();

		//delete album
		await usersAlbum.destroy();
  
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

module.exports = {
	getAllAlbums,
	showAlbum,
	createAlbum,
	updateAlbum,
	deleteAlbum,
	addPhotoToAlbum
}
