import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => (
  <div className="relative overflow-hidden">
    <div className="orb orb-teal" />
    <div className="orb orb-coral" />
    <div className="container mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-panel max-w-4xl mx-auto p-10"
      >
        <p className="uppercase text-xs tracking-[0.3em] text-slate-200/70">Hackathon-ready platform</p>
        <h1 className="font-display text-4xl md:text-5xl text-white mt-4 leading-tight">
          Online Assignment Submission & Grading System
        </h1>
        <p className="mt-4 text-slate-200/80 text-base md:text-lg max-w-2xl">
          Simplify the classroom workflow with clean role-based dashboards, secure file submissions,
          and instant grading insights for both teachers and students.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to="/login"
            className="btn-primary"
          >
            Login as Student
          </Link>
          <Link
            to="/login?role=teacher"
            className="btn-secondary"
          >
            Login as Teacher
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="grid md:grid-cols-3 gap-6 mt-12"
      >
        {[
          {
            title: 'Fast submissions',
            body: 'Upload PDF or DOCX in seconds with clear status tracking and due date reminders.'
          },
          {
            title: 'Role-based access',
            body: 'Teachers create assignments and grade submissions while students stay focused.'
          },
          {
            title: 'Instant insights',
            body: 'Dashboards highlight progress, grades, and submission volumes at a glance.'
          }
        ].map((item) => (
          <div key={item.title} className="glass-panel p-6">
            <h3 className="text-white text-lg font-semibold">{item.title}</h3>
            <p className="mt-3 text-sm text-slate-200/80">{item.body}</p>
          </div>
        ))}
      </motion.div>
    </div>
  </div>
);

export default Home;