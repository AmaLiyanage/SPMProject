// app/(tabs)/stories/storiesStore.ts
// tiny in-memory store for stories to avoid passing big JSON via routes

export type Story = {
  id: string;
  userId: string;
  title?: string;
  type: "text" | "image" | "video" | "audio";
  content: string;
  text?: string;
  createdAt?: any;
  displayName?: string;
  profilePicture?: string;
};

let _stories: Story[] = [];

export const setStories = (stories: Story[]) => {
  _stories = stories;
};

export const getStories = (): Story[] => {
  return _stories;
};
