import { Router, type Response } from 'express'

import type { SqliteDatabase } from '../db/sqlite-types.js'

import { HttpError } from '../errors/http-error.js'

import type { AuthenticatedRequest } from '../middleware/authenticate.js'

import * as deped from '../services/deped.service.js'

import * as reports from '../services/reports.service.js'

import * as schoolSettings from '../services/schoolSettings.service.js'

import * as gradingSystem from '../services/gradingSystem.service.js'

import { updateStudentProfile } from '../services/student.service.js'

import * as classDao from '../dao/class.dao.js'



function paramId(raw: string | string[]): string {

  return Array.isArray(raw) ? raw[0]! : raw

}



export function depedRouter(db: SqliteDatabase): Router {

  const router = Router()



  router.get('/school-settings', (req: AuthenticatedRequest, res: Response) => {

    res.json(schoolSettings.getSchoolSettings(db, req.auth!.id) ?? null)

  })



  router.put('/school-settings', (req: AuthenticatedRequest, res: Response) => {

    res.json(schoolSettings.saveSchoolSettings(db, req.auth!.id, req.body))

  })



  router.get('/grading-systems', (req: AuthenticatedRequest, res: Response) => {

    res.json(gradingSystem.listGradingSystems(db, req.auth!.id))

  })



  router.post('/grading-systems', (req: AuthenticatedRequest, res: Response) => {

    try {

      res.status(201).json(

        gradingSystem.createGradingSystem(db, req.auth!.id, req.body.name),

      )

    } catch (e) {

      if (e instanceof HttpError) {

        res.status(e.statusCode).json({ error: e.message, code: e.code })

        return

      }

      res.status(500).json({ error: 'create grading system failed' })

    }

  })



  router.patch('/grading-systems/:id/activate', (req: AuthenticatedRequest, res: Response) => {

    try {

      res.json(

        gradingSystem.activateGradingSystem(db, req.auth!.id, paramId(req.params.id)),

      )

    } catch (e) {

      if (e instanceof HttpError) {

        res.status(e.statusCode).json({ error: e.message, code: e.code })

        return

      }

      res.status(500).json({ error: 'activate grading system failed' })

    }

  })



  router.get('/grading-systems/:id/weights', (req: AuthenticatedRequest, res: Response) => {

    try {

      res.json(

        gradingSystem.getGradingSystemWeights(

          db,

          req.auth!.id,

          paramId(req.params.id),

        ),

      )

    } catch (e) {

      if (e instanceof HttpError) {

        res.status(e.statusCode).json({ error: e.message, code: e.code })

        return

      }

      res.status(500).json({ error: 'get weights failed' })

    }

  })



  router.put('/grading-systems/:id/weights', (req: AuthenticatedRequest, res: Response) => {

    try {

      res.json(

        gradingSystem.saveGradingSystemWeights(

          db,

          req.auth!.id,

          paramId(req.params.id),

          req.body.bands,

        ),

      )

    } catch (e) {

      if (e instanceof HttpError) {

        res.status(e.statusCode).json({ error: e.message, code: e.code })

        return

      }

      res.status(500).json({ error: 'save weights failed' })

    }

  })



  router.patch('/classes/:classId/metadata', (req: AuthenticatedRequest, res: Response) => {

    const userId = req.auth!.id

    const classId = paramId(req.params.classId)

    classDao.updateClassMetadata(db, userId, classId, {

      gradeLevel: req.body.gradeLevel,

      sectionName: req.body.sectionName,

      classAdviserName: req.body.classAdviserName,

    })

    res.json(classDao.getClassById(db, classId, userId))

  })



  router.patch('/students/:studentId', (req: AuthenticatedRequest, res: Response) => {

    const row = updateStudentProfile(

      db,

      req.auth!.id,

      paramId(req.params.studentId),

      req.body,

    )

    res.json(row)

  })



  router.post('/daily-attendance', (req: AuthenticatedRequest, res: Response) => {

    const { studentId, date, status, classId } = req.body

    const row = deped.upsertDailyAttendance(db, req.auth!.id, {

      studentId,

      date,

      status,

      classId,

      updatedAt: Date.now(),

    })

    res.json(row)

  })



  router.get('/classes/:classId/grades', (req: AuthenticatedRequest, res: Response) => {

    const userId = req.auth!.id

    const classId = paramId(req.params.classId)

    const schoolYearId =

      (req.query.schoolYearId as string) ?? deped.getActiveSchoolYearId(db, userId)

    const quarter = req.query.quarter

      ? Number(req.query.quarter)

      : undefined

    if (!schoolYearId) {

      res.status(400).json({ error: 'no active school year' })

      return

    }

    res.json(deped.listGradesByClass(db, userId, classId, schoolYearId, quarter))

  })



  router.post('/classes/:classId/grades/compute', (req: AuthenticatedRequest, res: Response) => {

    const userId = req.auth!.id

    const classId = paramId(req.params.classId)

    const quarter = Number(req.body.quarter ?? 1)

    const schoolYearId =

      req.body.schoolYearId ?? deped.getActiveSchoolYearId(db, userId)

    if (!schoolYearId) {

      res.status(400).json({ error: 'no active school year' })

      return

    }

    const rows = deped.computeGradesForClassQuarter(

      db,

      userId,

      classId,

      schoolYearId,

      quarter,

    )

    res.json(rows)

  })



  router.post('/classes/:classId/enrollment/archive', (req: AuthenticatedRequest, res: Response) => {

    const userId = req.auth!.id

    const classId = paramId(req.params.classId)

    const schoolYearId =

      req.body.schoolYearId ?? deped.getActiveSchoolYearId(db, userId)

    const settings = schoolSettings.getSchoolSettings(db, userId)

    if (!schoolYearId) {

      res.status(400).json({ error: 'no active school year' })

      return

    }

    const rows = deped.archiveEnrollmentForClass(

      db,

      userId,

      classId,

      schoolYearId,

      settings?.schoolName ?? 'School',

    )

    res.json(rows)

  })



  router.get('/students/:studentId/enrollment-history', (req: AuthenticatedRequest, res: Response) => {

    res.json(

      deped.listEnrollmentHistoryByStudent(

        db,

        req.auth!.id,

        paramId(req.params.studentId),

      ),

    )

  })



  router.post('/classes/:classId/reports/autofill', (req: AuthenticatedRequest, res: Response) => {

    try {

      const grades = reports.autoFillReportCardData(

        db,

        req.auth!.id,

        paramId(req.params.classId),

        req.body.schoolYearId,

      )

      res.json({ ok: true, grades })

    } catch (e) {

      if (e instanceof HttpError) {

        res.status(e.statusCode).json({ error: e.message })

        return

      }

      res.status(500).json({ error: 'autofill failed' })

    }

  })



  return router

}



export function reportsRouter(db: SqliteDatabase): Router {

  const router = Router()



  router.get('/:form', (req: AuthenticatedRequest, res: Response) => {

    try {

      const form = paramId(req.params.form).toLowerCase() as reports.ReportForm

      const result = reports.generateReport(db, req.auth!.id, {

        form,

        classId: req.query.classId as string | undefined,

        studentId: req.query.studentId as string | undefined,

        month: req.query.month as string | undefined,

        schoolYearId: req.query.schoolYearId as string | undefined,

      })

      res.download(result.outputPath)

    } catch (e) {

      if (e instanceof HttpError) {

        res.status(e.statusCode).json({ error: e.message })

        return

      }

      res.status(500).json({ error: 'report generation failed' })

    }

  })



  return router

}

