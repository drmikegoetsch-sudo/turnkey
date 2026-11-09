"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList, type Task } from "./task-list";
import { MaterialsList, type Material } from "./materials-list";
import { PhotoGallery, type Photo } from "./photo-gallery";
import { NotesFeed, type Note } from "./notes-feed";

export function ProjectTabs({
  projectId,
  today,
  team,
  tasks,
  materials,
  photos,
  notes,
}: {
  projectId: string;
  today: string;
  team: { id: string; name: string }[];
  tasks: Task[];
  materials: Material[];
  photos: Photo[];
  notes: Note[];
}) {
  const [tab, setTab] = useState("tasks");
  const openTasks = tasks.filter((t) => !t.completedAt).length;
  const materialsNeeded = materials.filter((m) => !m.checkedAt).length;

  // Four tabs share a phone-width bar, so labels shrink a size on small
  // screens instead of truncating.
  const trigger = "flex-1 px-1.5 text-xs sm:px-3 sm:text-sm";

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full">
        <TabsTrigger value="tasks" className={trigger}>
          Tasks ({openTasks || tasks.length})
        </TabsTrigger>
        <TabsTrigger value="materials" className={trigger}>
          Materials ({materialsNeeded || materials.length})
        </TabsTrigger>
        <TabsTrigger value="photos" className={trigger}>
          Media ({photos.length})
        </TabsTrigger>
        <TabsTrigger value="notes" className={trigger}>
          Notes ({notes.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="mt-4">
        <TaskList projectId={projectId} tasks={tasks} team={team} today={today} />
      </TabsContent>
      <TabsContent value="materials" className="mt-4">
        <MaterialsList projectId={projectId} materials={materials} />
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
