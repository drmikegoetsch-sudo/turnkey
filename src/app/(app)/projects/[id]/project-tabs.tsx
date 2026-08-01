"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList, type Task } from "./task-list";
import { PhotoGallery, type Photo } from "./photo-gallery";
import { NotesFeed, type Note } from "./notes-feed";

export function ProjectTabs({
  projectId,
  today,
  team,
  tasks,
  photos,
  notes,
}: {
  projectId: string;
  today: string;
  team: { id: string; name: string }[];
  tasks: Task[];
  photos: Photo[];
  notes: Note[];
}) {
  const [tab, setTab] = useState("tasks");
  const openTasks = tasks.filter((t) => !t.completedAt).length;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full">
        <TabsTrigger value="tasks" className="flex-1">
          Tasks ({openTasks || tasks.length})
        </TabsTrigger>
        <TabsTrigger value="photos" className="flex-1">
          Photos ({photos.length})
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex-1">
          Notes ({notes.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="mt-4">
        <TaskList projectId={projectId} tasks={tasks} team={team} today={today} />
      </TabsContent>
      <TabsContent value="photos" className="mt-4">
        <PhotoGallery projectId={projectId} photos={photos} />
      </TabsContent>
      <TabsContent value="notes" className="mt-4">
        <NotesFeed projectId={projectId} notes={notes} />
      </TabsContent>
    </Tabs>
  );
}
