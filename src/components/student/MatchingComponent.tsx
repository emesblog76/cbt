import React, { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Check, RotateCcw, Link as LinkIcon, Unlink } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MatchingPair {
  leftItem: string
  rightItem: string
}

interface MatchingItem {
  id: string
  content: string
  type: 'left' | 'right'
}

interface MatchingComponentProps {
  leftItems: string[]
  rightItems: string[]
  onMatch?: (connections: Record<string, string>) => void
  readOnly?: boolean
  initialConnections?: Record<string, string>
}

const SortableItem: React.FC<{
  id: string
  content: string
  type: 'left' | 'right'
  isDragging?: boolean
  isConnected?: boolean
}> = ({ id, content, type, isDragging, isConnected }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-4 border rounded-lg cursor-move transition-all duration-200",
        "hover:border-primary hover:shadow-md",
        isDragging && "border-primary shadow-lg scale-105",
        isConnected && "bg-primary/10 border-primary",
        type === 'left' 
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" 
          : "bg-green-50 dark:bg-green-900/20 border-green-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            type === 'left' 
              ? "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
              : "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
          )}>
            {type === 'left' ? 'L' : 'R'}
          </div>
          <div 
            className="prose prose-sm max-w-none" 
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
        {isConnected && (
          <LinkIcon className="w-4 h-4 text-primary" />
        )}
      </div>
    </div>
  )
}

const ConnectionLine: React.FC<{
  from: { x: number; y: number }
  to: { x: number; y: number }
  isValid: boolean
}> = ({ from, to, isValid }) => {
  const length = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI

  return (
    <div
      className="absolute pointer-events-none z-0"
      style={{
        left: from.x,
        top: from.y,
        width: length,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 0',
      }}
    >
      <div
        className={cn(
          "h-0.5 absolute top-1/2 -translate-y-1/2 w-full",
          isValid 
            ? "bg-green-500" 
            : "bg-red-500"
        )}
        style={{
          backgroundImage: isValid 
            ? "linear-gradient(90deg, transparent, transparent 50%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.5) 100%)"
            : "linear-gradient(90deg, transparent, transparent 50%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.5) 100%)",
          backgroundSize: '10px 2px',
        }}
      />
      <div
        className={cn(
          "w-3 h-3 rounded-full absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
          isValid ? "bg-green-500" : "bg-red-500"
        )}
      />
    </div>
  )
}

const MatchingComponent: React.FC<MatchingComponentProps> = ({
  leftItems,
  rightItems,
  onMatch,
  readOnly = false,
  initialConnections = {}
}) => {
  const [leftSide, setLeftSide] = useState<MatchingItem[]>(
    leftItems.map((item, index) => ({
      id: `left-${index}`,
      content: item,
      type: 'left'
    }))
  )
  
  const [rightSide, setRightSide] = useState<MatchingItem[]>(
    rightItems.map((item, index) => ({
      id: `right-${index}`,
      content: item,
      type: 'right'
    }))
  )

  const [connections, setConnections] = useState<Record<string, string>>(initialConnections)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [connectionPoints, setConnectionPoints] = useState<Record<string, DOMRect>>({})

  const updateConnectionPoints = useCallback(() => {
    const points: Record<string, DOMRect> = {}
    document.querySelectorAll('.matching-item').forEach((element) => {
      const id = element.getAttribute('data-id')
      if (id) {
        points[id] = element.getBoundingClientRect()
      }
    })
    setConnectionPoints(points)
  }, [])

  React.useEffect(() => {
    updateConnectionPoints()
    window.addEventListener('resize', updateConnectionPoints)
    return () => window.removeEventListener('resize', updateConnectionPoints)
  }, [updateConnectionPoints])

  const handleDragStart = (event: DragStartEvent) => {
    if (readOnly) return
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return

    const { active, over } = event
    if (!over) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // If dragging within same side
    if (activeId.startsWith('left') && overId.startsWith('left')) {
      const oldIndex = leftSide.findIndex(item => item.id === activeId)
      const newIndex = leftSide.findIndex(item => item.id === overId)
      setLeftSide(arrayMove(leftSide, oldIndex, newIndex))
    } else if (activeId.startsWith('right') && overId.startsWith('right')) {
      const oldIndex = rightSide.findIndex(item => item.id === activeId)
      const newIndex = rightSide.findIndex(item => item.id === overId)
      setRightSide(arrayMove(rightSide, oldIndex, newIndex))
    } 
    // If making a connection
    else if (
      (activeId.startsWith('left') && overId.startsWith('right')) ||
      (activeId.startsWith('right') && overId.startsWith('left'))
    ) {
      const newConnections = { ...connections }
      
      // Remove any existing connections to the active item
      Object.keys(newConnections).forEach(key => {
        if (newConnections[key] === activeId) {
          delete newConnections[key]
        }
      })
      
      // Remove any existing connections from the active item
      if (newConnections[activeId]) {
        delete newConnections[activeId]
      }

      // Create new connection
      newConnections[activeId] = overId
      newConnections[overId] = activeId
      
      setConnections(newConnections)
      onMatch?.(newConnections)
    }

    setActiveId(null)
    setTimeout(updateConnectionPoints, 100)
  }

  const handleRemoveConnection = (itemId: string) => {
    if (readOnly) return
    
    const newConnections = { ...connections }
    const connectedId = newConnections[itemId]
    
    if (connectedId) {
      delete newConnections[itemId]
      delete newConnections[connectedId]
      setConnections(newConnections)
      onMatch?.(newConnections)
    }
  }

  const handleReset = () => {
    if (readOnly) return
    setConnections({})
    onMatch?.({})
  }

  const getConnectionLine = (fromId: string, toId: string) => {
    const fromRect = connectionPoints[fromId]
    const toRect = connectionPoints[toId]
    
    if (!fromRect || !toRect) return null

    const fromCenter = {
      x: fromRect.left + fromRect.width / 2,
      y: fromRect.top + fromRect.height / 2
    }
    
    const toCenter = {
      x: toRect.left + toRect.width / 2,
      y: toRect.top + toRect.height / 2
    }

    return { from: fromCenter, to: toCenter }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-lg">Soal Menjodohkan</h3>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onMatch?.(connections)}
              >
                <Check className="w-4 h-4 mr-2" />
                Simpan Jawaban
              </Button>
            </div>
          )}
        </div>

        <div className="relative">
          {/* Connection lines */}
          {Object.entries(connections).map(([fromId, toId]) => {
            if (fromId.startsWith('left')) { // Only draw once per pair
              const line = getConnectionLine(fromId, toId)
              if (line) {
                return (
                  <ConnectionLine
                    key={`${fromId}-${toId}`}
                    from={line.from}
                    to={line.to}
                    isValid={true}
                  />
                )
              }
            }
            return null
          })}

          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 text-center">
                    Kolom Kiri
                  </h4>
                </div>
                <SortableContext 
                  items={leftSide.map(item => item.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {leftSide.map((item) => {
                    const isConnected = !!connections[item.id]
                    const connectedItemId = connections[item.id]
                    
                    return (
                      <div 
                        key={item.id}
                        data-id={item.id}
                        className="matching-item relative"
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <SortableItem
                          id={item.id}
                          content={item.content}
                          type="left"
                          isDragging={activeId === item.id}
                          isConnected={isConnected}
                        />
                        {isConnected && hoveredItem === item.id && !readOnly && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10"
                            onClick={() => handleRemoveConnection(item.id)}
                          >
                            <Unlink className="w-3 h-3" />
                          </Button>
                        )}
                        {isConnected && connectedItemId && connectionPoints[connectedItemId] && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </SortableContext>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-700 dark:text-green-300 text-center">
                    Kolom Kanan
                  </h4>
                </div>
                <SortableContext 
                  items={rightSide.map(item => item.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {rightSide.map((item) => {
                    const isConnected = !!connections[item.id]
                    
                    return (
                      <div 
                        key={item.id}
                        data-id={item.id}
                        className="matching-item relative"
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <SortableItem
                          id={item.id}
                          content={item.content}
                          type="right"
                          isDragging={activeId === item.id}
                          isConnected={isConnected}
                        />
                        {isConnected && hoveredItem === item.id && !readOnly && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10"
                            onClick={() => handleRemoveConnection(item.id)}
                          >
                            <Unlink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </SortableContext>
              </div>
            </div>
          </DndContext>

          {!readOnly && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Drag item dari kolom kiri</span>
                <div className="w-2 h-2 rounded-full bg-green-500 ml-4" />
                <span>Drop ke item di kolom kanan</span>
                <div className="w-2 h-2 rounded-full bg-green-500 ml-4" />
                <span>Garis hijau menunjukkan koneksi yang valid</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MatchingComponent
