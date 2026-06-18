export interface RoomHeroProps {
  story: string;
  roomId: string;
}

export function RoomHero({ story, roomId }: RoomHeroProps) {
  return (
    <section className="room-hero">
      <div className="room-hero__copy">
        <h1 className={story ? undefined : "room-hero__room-id"}>{story || `Room ${roomId}`}</h1>
      </div>
    </section>
  );
}
