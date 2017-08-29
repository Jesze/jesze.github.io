

$('.model')
.mousemove(function(e)
{
	var offs = $(this).offset(),
		p    = {x:offs.left, y:offs.top},
		mPos = {x:e.pageX, y:e.pageY},
		x    = mPos.x - p.x - 100,
		y    = mPos.y - p.y - 100;

	$('.gray', this).css({left:x, top:y, backgroundPosition: -x+'px '+-y+'px', width:200, height:200});
    
})
.mouseleave(function(m)
{
	$('.gray', this).css({width:0, height:0});	
});
