"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  uploadFileMatchAction,
  uploadImageMatchAction,
  uploadUrlMatchAction,
} from "@/lib/ingest/actions";

const FORMATS = ["Highlights", "T20", "ODI", "Test"] as const;

export function UploadTabs() {
  return (
    <Tabs className="space-y-4" defaultValue="file">
      <TabsList>
        <TabsTrigger value="file">Upload file</TabsTrigger>
        <TabsTrigger value="url">Paste URL</TabsTrigger>
        <TabsTrigger value="image">Upload image</TabsTrigger>
      </TabsList>
      <TabsContent value="file">
        <FileTab />
      </TabsContent>
      <TabsContent value="url">
        <UrlTab />
      </TabsContent>
      <TabsContent value="image">
        <ImageTab />
      </TabsContent>
    </Tabs>
  );
}

function FileTab() {
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  const onSubmit = (formData: FormData) => {
    if (!file) {
      toast.error("Choose a video file");
      return;
    }
    start(async () => {
      const result = await uploadFileMatchAction({
        title: String(formData.get("title") ?? ""),
        format:
          (formData.get("format") as "T20" | "ODI" | "Test" | "Highlights") ??
          "Highlights",
        file,
      });
      if (!result.ok) {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <form
      action={onSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="file-title">Title</Label>
        <Input
          id="file-title"
          name="title"
          placeholder="IND v AUS — 1st T20"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-format">Format</Label>
        <Select defaultValue="Highlights" name="format">
          <SelectTrigger id="file-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="file-input">Video file (max 500 MB)</Label>
        <Input
          accept="video/*"
          id="file-input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          type="file"
        />
        {file ? (
          <p className="text-muted-foreground text-xs">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        ) : null}
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Uploading…" : "Analyze"}
      </Button>
    </form>
  );
}

function UrlTab() {
  const [pending, start] = useTransition();
  const onSubmit = (formData: FormData) => {
    start(async () => {
      const result = await uploadUrlMatchAction(formData);
      if (!result.ok) {
        toast.error(result.error.message);
      }
    });
  };
  return (
    <form
      action={onSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="url-title">Title</Label>
        <Input
          id="url-title"
          name="title"
          placeholder="Highlights — 2nd ODI"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url-format">Format</Label>
        <Select defaultValue="Highlights" name="format">
          <SelectTrigger id="url-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="url-input">Video URL</Label>
        <Input
          id="url-input"
          name="url"
          placeholder="https://www.youtube.com/watch?v=…"
          required
          type="url"
        />
        <p className="text-muted-foreground text-xs">
          Use only with content you own or that's in the public domain.
        </p>
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Queuing…" : "Analyze URL"}
      </Button>
    </form>
  );
}

function ImageTab() {
  const [pending, start] = useTransition();
  const onSubmit = (formData: FormData) => {
    start(async () => {
      const result = await uploadImageMatchAction(formData);
      if (!result.ok) {
        toast.error(result.error.message);
      }
    });
  };
  return (
    <form
      action={onSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="image-title">Title</Label>
        <Input
          id="image-title"
          name="title"
          placeholder="Cover drive — Day 3"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="image-input">Image (max 25 MB)</Label>
        <Input
          accept="image/*"
          id="image-input"
          name="image"
          required
          type="file"
        />
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Uploading…" : "Analyze image"}
      </Button>
    </form>
  );
}
