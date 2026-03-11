import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { isAuthenticated, subscribeAuthChanged } from "./auth/token";
import { AppShell } from "./components/AppShell";
import { NotesPage } from "./pages/NotesPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { EditTagPage } from "./pages/EditTagPage";
import { RemindersPage } from "./pages/RemindersPage";
import { MergeTagPage } from "./pages/MergeTagPage";
import { NewTagPage } from "./pages/NewTagPage";
import { TagsPage } from "./pages/TagsPage";

const NewNotePage = lazy(() => import("./pages/NewNotePage").then((module) => ({ default: module.NewNotePage })));

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [authed, setAuthed] = useState(() => isAuthenticated());

  useEffect(() => {
    return subscribeAuthChanged(() => {
      setAuthed(isAuthenticated());
    });
  }, []);

  if (!authed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const [authed, setAuthed] = useState(() => isAuthenticated());

  useEffect(() => {
    return subscribeAuthChanged(() => {
      setAuthed(isAuthenticated());
    });
  }, []);

  if (authed) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/notes" replace />} />
        <Route path="notes" element={<NotesPage />} />
        <Route
          path="notes/new"
          element={
            <Suspense fallback={<div className="p-6 text-sm text-[#64748B]">编辑器加载中...</div>}>
              <NewNotePage />
            </Suspense>
          }
        />
        <Route
          path="notes/:noteId/edit"
          element={
            <Suspense fallback={<div className="p-6 text-sm text-[#64748B]">编辑器加载中...</div>}>
              <NewNotePage />
            </Suspense>
          }
        />
        <Route path="tags" element={<TagsPage />} />
        <Route path="tags/new" element={<NewTagPage />} />
        <Route path="tags/:tagId/edit" element={<EditTagPage />} />
        <Route path="tags/merge" element={<MergeTagPage />} />
        <Route path="reminders" element={<RemindersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}
