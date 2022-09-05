/**
 * The starting point of the application.
 *
 * @author Fredrik Jurgell
 * @version 1.0.0
 */

import express from 'express'
import hbs from 'express-hbs'
import session from 'express-session'
import helmet from 'helmet'
import logger from 'morgan'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { router } from './routes/router.js'
import dotenv from 'dotenv'
dotenv.config()

/**
 * The main function of the application.
 */
const main = async () => {
  // Creates an Express application.
  const app = express()

  // Get the diretory name of this module's path.
  const directoryFullName = dirname(fileURLToPath(import.meta.url))

  const baseURL = process.env.BASE_URL || '/'

  // Set various HTTP headers to make the application little more secure (https://npmjs.com/package/helmet).
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'", 'api.giphy.com'],
        imgSrc: ["'self'", 'https://media4.giphy.com/', 'https://media2.giphy.com/', 'https://media1.giphy.com/', 'https://media0.giphy.com/'],
        scriptSrc: ["'self'", "'unsafe-eval'", 'cdn.jsdelivr.net']
      }
    })
  )

  // Set up a morgan logger using the dev format for log entries.
  app.use(logger('dev'))

  // View engine setup.
  app.engine('hbs', hbs.express4({
    defaultLayout: join(directoryFullName, 'views', 'layouts', 'default')
  }))
  app.set('view engine', 'hbs')
  app.set('views', join(directoryFullName, 'views'))

  // Parse requests of the content type application/x-www-form-urlendoded.
  // Populates the request object with a body object (req.body).
  app.use(express.urlencoded({ extended: false }))

  // Webhook: Enable body parsing of application/json
  // Populates the request object with a body object (req.body).
  app.use(express.json())

  // Serve static files.
  app.use(express.static(join(directoryFullName, '..', 'public')))

  // Setup and use session middleware (https://github.com/expressjs/session).
  const sessionOptions = {
    name: process.env.SESSION_NAME,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: 'lax'
    }
  }

  if (app.get('env') === 'production') {
    app.set('trust proxy', 1)
    sessionOptions.cookie.secure = true
  }

  app.use(session(sessionOptions))

  // Middleware to be executed before the routes.
  app.use((req, res, next) => {
    if (req.session.flash) {
      res.locals.flash = req.session.flash
      delete req.session.flash
    }

    // Pass the base URL to the views.
    res.locals.baseURL = baseURL

    next()
  })

  // Hide logout when not loged in, and hide register and login when loged in.
  app.use((req, res, next) => {
    if (req.session.user) {
      res.locals.user = req.session.user
    }
    next()
  })

  // Register routes.
  app.use('/', router)

  // Error handler.
  app.use(function (err, req, res, next) {
    // 404 Not Found.
    if (err.statusCode === 404) {
      return res
        .status(404)
        .sendFile(join(directoryFullName, 'views', 'errors', '404.html'))
    }

    // 500 Internal Server Error (in production, all other errors sen this response).
    if (req.app.get('env') !== 'development') {
      return res
        .status(500)
        .sendFile(join(directoryFullName, 'views', 'errors', '500.html'))
    }

    // Development only!
    // Only providing detailed error in development.

    // Render the error page.
    res
      .status(err.statusCode || 500)
      .render('errors/error', { error: err })
  })

  // Starts the HTTP server listening for connections.
  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`)
    console.log('Press Ctrl-C to terminate...')
  })
}

main().catch(console.error)

